import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check15Summary() {
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2026)
        .eq('class_info', '1-5');

    if (error) {
        console.error(error);
        return;
    }

    const total = students.length;
    const active = students.filter(s => {
        const st = String(s.status || "").toLowerCase().trim();
        return !st.includes("전출") && !st.includes("자퇴") && st !== "transferred" && st !== "withdrawn" && st !== "dropout";
    }).length;

    console.log(`1-5 Total: ${total}`);
    console.log(`1-5 Active: ${active}`);

    students.forEach(s => {
        const st = String(s.status || "").toLowerCase().trim();
        const isExcluded = st.includes("전출") || st.includes("자퇴") || st === "transferred" || st === "withdrawn" || st === "dropout";
        if (isExcluded) {
            console.log(`- Excluded: ${s.student_id} ${s.name} (${s.status})`);
        }
    });
}

check15Summary();
