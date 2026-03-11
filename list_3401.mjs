import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data: student } = await supabase.from('students').select('pid').eq('student_id', '3401').eq('academic_year', 2026).single();
    if (!student) { console.log('Student not found'); return; }
    const { data: records } = await supabase.from('life_records').select('id, category, teacher_email_prefix, created_at').eq('student_pid', student.pid).gte('created_at', '2026-03-11T00:00:00Z').lte('created_at', '2026-03-11T23:59:59Z');
    records.forEach(r => console.log(JSON.stringify(r)));
}
run();
