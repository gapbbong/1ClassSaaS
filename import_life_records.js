/**
 * import_life_records.js
 *
 * 구글 시트 "생활기록" 을 CSV로 내보낸 파일을 읽어
 * Supabase life_records 테이블로 이관합니다.
 *
 * [준비]
 * 1. 구글 스프레드시트에서 "생활기록" 시트 선택
 * 2. 파일 > 다운로드 > CSV (.csv)
 * 3. 다운받은 파일을 이 프로젝트 폴더에 '생활기록.csv' 로 저장
 *
 * [실행]
 * node import_life_records.js
 *
 * CSV 컬럼 순서 (GAS doPost 저장 기준):
 * 시간, 학번, 이름, 교사, 잘한일, 못한일, 상세
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CSV 파싱 (따옴표 처리 포함)
function parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.map(line => {
        const cols = [];
        let cur = '';
        let inQuote = false;
        for (const ch of line) {
            if (ch === '"') { inQuote = !inQuote; }
            else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
            else { cur += ch; }
        }
        cols.push(cur.trim());
        return cols;
    });
}

async function main() {
    // CSV 파일 찾기 (생활기록.csv 우선, 없으면 첫 번째 csv 파일)
    let csvPath = path.join(__dirname, '생활기록.csv');
    if (!fs.existsSync(csvPath)) {
        const csvFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.csv'));
        if (csvFiles.length === 0) {
            console.error('❌ CSV 파일이 없습니다. "생활기록" 시트를 CSV로 내보내서 이 폴더에 저장해주세요.');
            console.log('   저장 위치:', __dirname);
            process.exit(1);
        }
        csvPath = path.join(__dirname, csvFiles[0]);
        console.log(`📂 발견된 CSV: ${csvFiles[0]}`);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(content);

    // 헤더 행 제거 (첫 행이 헤더인지 확인)
    let startIdx = 0;
    const firstRow = rows[0];
    if (firstRow[0] === '시간' || firstRow[0] === '날짜' || isNaN(Date.parse(firstRow[0]))) {
        console.log(`📋 헤더 제거: ${firstRow.join(', ')}`);
        startIdx = 1;
    }

    const dataRows = rows.slice(startIdx).filter(r => r[1]); // 학번(idx=1) 있는 행만
    console.log(`📊 총 ${dataRows.length}건 데이터 발견`);

    // Supabase에서 학번 → pid 매핑
    console.log('🔍 학생 PID 매핑 중...');
    const allNums = [...new Set(dataRows.map(r => String(r[1]).trim()))];
    let students = [];
    for (let i = 0; i < allNums.length; i += 1000) {
        const chunk = allNums.slice(i, i + 1000);
        const { data, error } = await supabase
            .from('students')
            .select('pid, student_id')
            .in('student_id', chunk);
        if (error) throw error;
        students.push(...data);
    }

    const pidMap = {};
    students.forEach(s => { pidMap[s.student_id] = s.pid; });
    console.log(`✅ ${students.length}명 PID 매핑 완료 (${allNums.length - students.length}명 미존재)`);

    // 삽입 데이터 생성
    const insertData = [];
    let skipped = 0;
    for (const r of dataRows) {
        const num = String(r[1]).trim();
        const pid = pidMap[num];
        if (!pid) { skipped++; continue; }

        const timeRaw = r[5]?.trim(); // "시간" 혹은 "날짜" (CSV에서 6번째 컬럼으로 추정)
        let createdAt = new Date().toISOString(); // Default to now
        if (timeRaw) {
            const parsedDt = new Date(timeRaw);
            if (!isNaN(parsedDt.getTime())) {
                createdAt = parsedDt.toISOString();
            } else {
                // If it's something like "2025-12-13 14:23", javascript Date can usually parse it.
                // Fallback to safe parsing or keep current time if totally unparseable
                createdAt = new Date().toISOString();
            }
        }

        const good = r[3]?.trim() || '';
        const bad = r[4]?.trim() || '';
        const detail = r[7]?.trim() || '';
        const teacher = r[6]?.trim() || '선생님';

        const category = good || bad || '생활기록';
        const content = detail;
        const isPositive = !!good;

        insertData.push({
            student_pid: pid,
            category,
            content,
            is_positive: isPositive,
            teacher_email_prefix: teacher,
            created_at: createdAt
        });
    }

    console.log(`📋 ${insertData.length}건 삽입 예정 (${skipped}건 스킵)`);

    // 500건씩 배치 삽입, 5개씩 병렬 실행 (Promise.all)
    const BATCH = 500;
    const CONCURRENCY = 5;
    let inserted = 0;
    const batches = [];
    for (let i = 0; i < insertData.length; i += BATCH) {
        batches.push(insertData.slice(i, i + BATCH));
    }

    console.log(`🚀 총 ${batches.length}개 배치 작업 시작... (동시 ${CONCURRENCY}개 실행)`);

    for (let i = 0; i < batches.length; i += CONCURRENCY) {
        const currentBatches = batches.slice(i, i + CONCURRENCY);
        const promises = currentBatches.map(async (batch, idx) => {
            const batchNum = i + idx + 1;
            const { error } = await supabase.from('life_records').insert(batch);
            if (error) {
                console.error(`❌ 배치 삽입 실패 (배치 ${batchNum}):`, error.message);
            } else {
                inserted += batch.length;
                console.log(`   ✅ ${inserted}/${insertData.length}건 완료 (배치 ${batchNum}/${batches.length})`);
            }
        });
        await Promise.all(promises);
    }

    console.log(`\n🎉 이관 완료! ${inserted}건 삽입됨`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
