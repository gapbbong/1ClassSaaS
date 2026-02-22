/**
 * migrate_records.js
 * 
 * 구글 앱스 스크립트(GAS)의 "생활기록" 시트 데이터를
 * Supabase의 life_records 테이블로 이관합니다.
 * 
 * 실행: node migrate_records.js
 * 
 * 사전 조건:
 * - GAS에 getAllRecords 함수가 배포되어 있어야 함
 * - .env에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GAS_URL = "https://script.google.com/macros/s/AKfycbyfadmRNyOpRww3m13PVnx_E_6ft9gzrqleOx2q_8X9WXFpom31vYpgjzZg9MK01hcZ3Q/exec";

async function fetchAllRecordsFromGAS() {
    console.log("📡 GAS에서 전체 생활기록 가져오는 중...");
    const url = `${GAS_URL}?action=getAllRecords`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GAS 요청 실패: ${res.status}`);
    const data = await res.json();
    console.log(`✅ GAS에서 ${data.length}건 로드 완료`);
    return data;
}

async function buildStudentPidMap(nums) {
    console.log(`🔍 ${nums.length}개 학번으로 Supabase PID 조회 중...`);
    const uniqueNums = [...new Set(nums)];
    const { data, error } = await supabase
        .from('students')
        .select('pid, student_id')
        .in('student_id', uniqueNums);

    if (error) throw error;

    const pidMap = {};
    data.forEach(s => { pidMap[s.student_id] = s.pid; });
    console.log(`✅ ${data.length}명의 PID 매핑 완료`);
    return pidMap;
}

async function insertRecords(records, pidMap) {
    const insertData = [];
    let skipped = 0;

    for (const r of records) {
        const pid = pidMap[r.num];
        if (!pid) {
            skipped++;
            continue; // 학번 매핑 없으면 스킵
        }

        // good/bad 중 하나가 있는 경우만 category 결정
        const isPositive = !!r.good;
        const category = r.good || r.bad || "기록";
        const content = r.detail || "";

        // category와 content 모두 비어있으면 스킵
        if (!category && !content) {
            skipped++;
            continue;
        }

        insertData.push({
            student_pid: pid,
            category,
            content,
            is_positive: isPositive,
            teacher_email_prefix: r.teacher || "선생님",
            created_at: r.time || new Date().toISOString()
        });
    }

    console.log(`📋 ${insertData.length}건 삽입 예정 (${skipped}건 스킵)`);

    // 배치 처리 (100건씩)
    const BATCH = 100;
    let inserted = 0;
    for (let i = 0; i < insertData.length; i += BATCH) {
        const batch = insertData.slice(i, i + BATCH);
        const { error } = await supabase.from('life_records').insert(batch);
        if (error) {
            console.error(`❌ 배치 ${i}-${i + BATCH} 삽입 실패:`, error.message);
        } else {
            inserted += batch.length;
            console.log(`   ... ${inserted}건 삽입 완료`);
        }
    }

    return inserted;
}

async function main() {
    try {
        // 1. GAS에서 전체 생활기록 가져오기
        const records = await fetchAllRecordsFromGAS();

        if (!records || records.length === 0) {
            console.log("⚠️ 가져온 기록이 없습니다. GAS 배포 여부와 시트명(생활기록)을 확인하세요.");
            return;
        }

        // 2. 학번 목록 추출 → Supabase PID 매핑
        const allNums = records.map(r => r.num).filter(Boolean);
        const pidMap = await buildStudentPidMap(allNums);

        // 3. life_records에 삽입
        const count = await insertRecords(records, pidMap);

        console.log(`\n🎉 완료! 총 ${count}건의 생활기록이 Supabase에 이관되었습니다.`);
    } catch (err) {
        console.error("❌ 오류 발생:", err.message);
        process.exit(1);
    }
}

main();
