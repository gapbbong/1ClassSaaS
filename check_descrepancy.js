import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDescrepancy() {
    console.log("🧐 [분심] 현재 3학년 데이터 무결성 체크...");

    // 1. 현재 2026학년도 3학년 (이미지 기반 복구 결과)
    const { data: current3rd } = await supabase
        .from('students')
        .select('pid, name, student_id, photo_url, class_info')
        .eq('academic_year', 2026)
        .ilike('class_info', '3-%');

    // 2. 2025년 원본 히스토리 (작년 2학년 명단)
    const pool2025g2 = JSON.parse(fs.readFileSync('pool_2025_g2.json', 'utf8'));

    console.log(`현재 DB 3학년: ${current3rd?.length || 0}명`);
    console.log(`Pool(작년 2학년) 인원: ${pool2025g2?.length || 0}명`);

    const report = [];
    current3rd.forEach(s => {
        const original = pool2025g2.find(h => h.student_pid === s.pid);
        if (!original) {
            report.push({ name: s.name, id: s.student_id, issue: '작년 2학년 히스토리에 PID가 없는 학생 (신규 생성됨)' });
        } else {
            // 이름이 달라졌는지 확인 (이게 엉망의 원인일 수 있음)
            // original 데이터에는 이름이 없으므로 Students 테이블에서 PID로 다시 확인 필요
        }
    });

    fs.writeFileSync('recovery_descrepancy_report.json', JSON.stringify(report, null, 2));
    console.log("💾 'recovery_descrepancy_report.json' 저장 완료.");
}

checkDescrepancy();
