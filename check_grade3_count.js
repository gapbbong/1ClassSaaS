import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkGrade3() {
    const { data: students, error } = await supabase
        .from('students')
        .select('student_id, name, status, class_info, gender')
        .eq('academic_year', 2026)
        .like('class_info', '3-%')
        .order('student_id');

    if (error) {
        console.error(error);
        return;
    }

    const classSummary = {};
    const statusesFound = new Set();
    const gendersFound = new Set();

    students.forEach(s => {
        const cls = s.class_info || 'unknown';
        if (!classSummary[cls]) {
            classSummary[cls] = { total: 0, active: 0, inactive: [], genderMissing: [] };
        }
        classSummary[cls].total++;

        const st = String(s.status || "").toLowerCase().trim();
        statusesFound.add(s.status);
        gendersFound.add(s.gender);

        const isExcluded = st.includes("전출") || st.includes("자퇴") || st === "transferred" || st === "withdrawn" || st === "dropout" || st === "graduated" || st.includes("졸업");

        if (!isExcluded) {
            classSummary[cls].active++;
            if (!s.gender || !['남', '여', '남자', '여자'].includes(String(s.gender).trim())) {
                classSummary[cls].genderMissing.push(`${s.student_id} ${s.name}`);
            }
        } else {
            classSummary[cls].inactive.push(`${s.student_id} ${s.name} (${s.status})`);
        }
    });

    console.log("=== 3학년 학급별 인원 현황 (2026) ===");
    Object.keys(classSummary).sort().forEach(cls => {
        const c = classSummary[cls];
        console.log(`[${cls}] 총원: ${c.total} | 재학(집계): ${c.active} | 제외됨: ${c.inactive.length}`);
        if (c.inactive.length > 0) {
            console.log(`  - 🚫 제외 명단: ${c.inactive.join(', ')}`);
        }
        if (c.genderMissing.length > 0) {
            console.log(`  - ⚠️ 성별 누락: ${c.genderMissing.join(', ')}`);
        }
    });

    console.log("\n발견된 학적 상탯값:", Array.from(statusesFound));
    console.log("발견된 성별값:", Array.from(gendersFound));
}

checkGrade3();
