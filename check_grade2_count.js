import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkGrade2() {
    const { data: students, error } = await supabase
        .from('students')
        .select('student_id, name, status, class_info')
        .eq('academic_year', 2026)
        .like('class_info', '2-%')
        .order('student_id');

    if (error) {
        console.error(error);
        return;
    }

    const classSummary = {};
    const statusesFound = new Set();

    students.forEach(s => {
        const cls = s.class_info || 'unknown';
        if (!classSummary[cls]) {
            classSummary[cls] = { total: 0, active: 0, inactive: [] };
        }
        classSummary[cls].total++;

        const st = String(s.status || "").toLowerCase().trim();
        statusesFound.add(s.status);

        const isExcluded = st.includes("전출") || st.includes("자퇴") || st === "transferred" || st === "withdrawn" || st === "dropout" || st === "graduated" || st.includes("졸업");

        if (!isExcluded) {
            classSummary[cls].active++;
        } else {
            classSummary[cls].inactive.push(`${s.student_id} ${s.name} (${s.status})`);
        }
    });

    console.log("=== 2학년 학급별 인원 현황 (2026) ===");
    Object.keys(classSummary).sort().forEach(cls => {
        const c = classSummary[cls];
        console.log(`[${cls}] 총원: ${c.total} | 재학(집계): ${c.active} | 제외됨: ${c.inactive.length}`);
        if (c.inactive.length > 0) {
            c.inactive.forEach(line => console.log(`  - ${line}`));
        }
    });

    console.log("\n발견된 학적 상탯값:", Array.from(statusesFound));
}

checkGrade2();
