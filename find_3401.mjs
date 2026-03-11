import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data: student } = await supabase.from('students').select('*').eq('student_id', '3401');
    console.log('Student count:', student?.length);
    student.forEach(s => console.log('Year:', s.academic_year, 'PID:', s.pid, 'Name:', s.name));
    
    // 이 PID들로 오늘 기록 찾기
    const pids = student.map(s => s.pid);
    const { data: records } = await supabase.from('life_records').select('*').in('student_pid', pids).gte('created_at', '2026-03-11T00:00:00Z');
    console.log('Today records count:', records?.length);
    records?.forEach(r => console.log('PID:', r.student_pid, 'ID:', r.id, 'Category:', r.category, 'Teacher:', r.teacher_email_prefix));
}
run();
