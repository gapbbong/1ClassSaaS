import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CSV 파싱 (단순 버전)
function parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim());
    const result = [];
    for (let i = 1; i < lines.length; i++) { // 헤더 스킵
        const cols = [];
        let cur = '';
        let inQuote = false;
        for (const ch of lines[i]) {
            if (ch === '"') inQuote = !inQuote;
            else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
            else cur += ch;
        }
        cols.push(cur.trim());
        result.push(cols);
    }
    return result;
}

async function restore() {
    console.log("🚑 생활기록 긴급 복구 시작 (PID 매핑 기준)...");

    // 1. 필요한 매핑 데이터 로드
    const recordsCsv = parseCSV(fs.readFileSync('./생활기록.csv', 'utf8'));
    const temp34Csv = parseCSV(fs.readFileSync('./temp_3_4.csv', 'utf8'));
    const nameMap = JSON.parse(fs.readFileSync('./name_map.json', 'utf8'));

    // 숫자 PID -> 이름 맵 생성 (temp_3_4.csv 기준)
    const numPidToName = {};
    temp34Csv.forEach(row => {
        const numPid = row[0]; // PID
        const name = row[8];   // 이름 (기존 1319 최현수 행에서 확인)
        if (numPid && name) numPidToName[numPid] = name;
    });

    console.log(`📊 CSV 발견 기록: ${recordsCsv.length}건`);

    let restoredCount = 0;
    const insertData = [];

    for (const r of recordsCsv) {
        const numPid = r[0];
        const studentName = r[2]; // CSV에 이름이 있음 (확실하게 하기 위해)
        const content = r[7];   // 상세

        if (!content) continue;

        // 원본 UUID PID 찾기 (name_map.json에서 2026학년도 매핑 기준)
        // 이름으로 찾되, 혹시 모르니 numPid를 통해 찾은 이름과 비교
        const mapping = nameMap.find(m => m.name === studentName && m.academic_year === 2026);

        if (!mapping) {
            console.warn(`⚠️ [${studentName}] 매핑 정보 없음, 스킵`);
            continue;
        }

        const originPid = mapping.pid;

        // 이 기록이 이미 DB에 있는지 중복 확인 (생성 시간과 내용 기준)
        const { data: existing } = await supabase
            .from('life_records')
            .select('id')
            .eq('student_pid', originPid)
            .eq('content', content)
            .limit(1);

        if (existing && existing.length > 0) {
            // console.log(`ℹ️ [${studentName}] 이미 존재하는 기록, 패스`);
            continue;
        }

        insertData.push({
            student_pid: originPid,
            category: r[3] || r[4] || "생활기록",
            content: content,
            is_positive: !!r[3],
            teacher_email_prefix: r[6] || "최지은",
            created_at: r[5] || new Date().toISOString()
        });
    }

    if (insertData.length > 0) {
        const { error: iError } = await supabase
            .from('life_records')
            .insert(insertData);

        if (iError) {
            console.error("❌ 복구 중 삽입 실패:", iError);
        } else {
            console.log(`✅ ${insertData.length}건의 기록 복구 완료!`);
            restoredCount = insertData.length;
        }
    } else {
        console.log("ℹ️ 새로 복구할 기록이 없습니다.");
    }

    console.log(`\n🎉 최종 완료!`);
}

restore().catch(err => console.error(err));
