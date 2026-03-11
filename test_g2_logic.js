import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkGrade2Logic() {
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2026)
        .neq('status', 'graduated');

    if (error) { console.error(error); return; }

    const mappedData = students.map(s => {
        const [gStr, cStr] = (s.class_info || '0-0').split('-');
        const grade = parseInt(gStr);
        const classNum = parseInt(cStr);

        return {
            ...s,
            "학년": grade,
            "반": classNum,
            "학번": s.student_id,
            "성별": s.gender,
            "학적": (() => {
                const st = String(s.status || "").toLowerCase().trim();
                // Match api.js update
                if (st === 'active' || st.includes('재학')) return '재학';
                if (st === 'transferred' || st.includes('전출')) return '전출';
                if (st === 'withdrawn' || st === 'dropout' || st.includes('자퇴')) return '자퇴';
                if (st === 'graduated' || st.includes('졸업')) return '졸업';
                return s.status || '재학';
            })(),
        };
    });

    const summary = {};
    const classSummary = {};

    mappedData.forEach(s => {
        let grade = s["학년"];
        const cls = s["반"];
        const status = s["학적"];

        // Handle grade override logic in search.js
        if (grade > 10 && s["학번"]) {
            const sNum = String(s["학번"]);
            grade = parseInt(sNum[0]) || grade;
        }

        if (!grade || !cls) return;
        if (status.includes("자퇴") || status.includes("전출")) return;

        // Major logic
        let major = "미지정";
        if ([1, 2, 3].includes(cls)) major = "IoT전기과";
        else if (grade === 1 && [4, 5, 6].includes(cls)) major = "게임콘텐츠과";
        else if (grade >= 2 && [4, 5, 6].includes(cls)) major = "전자제어과";

        if (grade === 2) {
            const key = `${grade}-${major}`;
            if (!summary[key]) summary[key] = { m: 0, f: 0 };
            if (s["성별"] === "남" || s["성별"] === "남자") summary[key].m++;
            else if (s["성별"] === "여" || s["성별"] === "여자") summary[key].f++;

            const ck = `${grade}-${cls}`;
            if (!classSummary[ck]) classSummary[ck] = 0;
            classSummary[ck]++;
        }
    });

    console.log("=== UI Logic Test (Grade 2) ===");
    console.log("Majors:", summary);
    const sumTotal = Object.values(summary).reduce((acc, v) => acc + v.m + v.f, 0);
    console.log("Total in Major Table:", sumTotal);

    console.log("Classes:", classSummary);
    const classTotal = Object.values(classSummary).reduce((acc, v) => acc + v, 0);
    console.log("Total in Class Table:", classTotal);
}

checkGrade2Logic();
