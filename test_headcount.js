import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testHeadcount() {
    // 1. fetchAllStudents mimic
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2026)
        .neq('status', 'graduated')
        .order('student_id', { ascending: true });

    if (error) { console.error(error); return; }

    // 2. mapStudentData mimic
    const mappedData = data.map(s => {
        const [gStr, cStr] = (s.class_info || '0-0').split('-');
        const grade = parseInt(gStr);
        const classNum = parseInt(cStr);

        return {
            ...s,
            "학년": grade,
            "반": classNum,
            "학번": s.student_id,
            "학적": (() => {
                const st = String(s.status || "").toLowerCase().trim();
                if (st === 'active' || st === '재학') return '재학';
                if (st === 'transferred' || st === '전출') return '전출';
                if (st === 'withdrawn' || st === 'dropout' || st === '자퇴') return '자퇴';
                if (st === 'graduated' || st === '졸업') return '졸업';
                return s.status || '재학';
            })(),
        };
    });

    // 3. Filter mimic
    const in15 = mappedData.filter(s => s["학년"] === 1 && s["반"] === 5);
    const activeIn15 = in15.filter(s => {
        const status = String(s["학적"] || "").trim();
        return !status.includes("전출") && !status.includes("자퇴");
    });

    console.log(`1-5 Results (Total records): ${in15.length}`);
    console.log(`1-5 Active (After filter): ${activeIn15.length}`);

    in15.forEach(s => {
        console.log(`${s.student_id} ${s.name} [Status: ${s.status}] [Mapped: ${s["학적"]}]`);
    });
}
testHeadcount();
