import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    try {
        const { data: students, error: sErr } = await supabase
            .from('students')
            .select('pid, name, student_id, class_info')
            .eq('academic_year', 2026)
            .neq('status', 'graduated')
            .order('student_id');

        if (sErr) throw sErr;

        const { data: surveys, error: svErr } = await supabase
            .from('surveys')
            .select('student_pid, data');

        if (svErr) throw svErr;

        const surveyMap = new Map(surveys.map(s => [String(s.student_pid).toLowerCase(), s.data]));

        const multicultural = [];
        const pending = [];

        for (const student of students) {
            const pidStr = String(student.pid).toLowerCase();
            const surveyData = surveyMap.get(pidStr);
            if (surveyData) {
                const isMulticultural = surveyData.다문화여부 && surveyData.다문화여부 !== '해당없음' && surveyData.다문화여부 !== '';
                const country = surveyData.다문화국가 || '';

                // "해당없음" 이지만 국가가 적힌 경우도 있을 수 있음
                if (isMulticultural || (country && country !== '해당없음' && country !== '없음' && country !== 'X' && country !== 'x')) {
                    multicultural.push({
                        ...student,
                        country: country,
                        type: surveyData.다문화여부
                    });
                }
            } else {
                pending.push(student);
            }
        }

        const result = {
            multiculturalCount: multicultural.length,
            multicultural: multicultural,
            pendingCount: pending.length,
            pending: pending.map(s => ({ class: s.class_info, id: s.student_id, name: s.name }))
        };

        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("오류 발생:", err.message);
    }
}

run();
