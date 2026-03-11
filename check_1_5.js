import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // The one in .env

const supabase = createClient(supabaseUrl, supabaseKey);

async function check15() {
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2026)
        .eq('class_info', '1-5')
        .order('student_id');

    if (error) {
        console.error(error);
        return;
    }

    console.log("=== 1학년 5반 학생 목록 (2026) ===");
    students.forEach(s => {
        console.log(`${s.student_id} | ${s.name} | 학적: ${s.status}`);
    });
}

check15();
