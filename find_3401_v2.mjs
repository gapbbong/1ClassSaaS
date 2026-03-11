import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    // 1. 학번 3401인 학생 전체 조회
    const { data: students } = await supabase.from('students').select('*').eq('student_id', '3401');
    console.log('--- Students ---');
    students.forEach(s => console.log('Year:', s.academic_year, 'PID:', s.pid, 'Name:', s.name));
    
    // 2. 전체 생활기록 중 오늘 날짜(2026-03-11 KST) 이후 기록 확인
    console.log('--- Today Records ---');
    const { data: records, error } = await supabase
        .from('life_records')
        .select('*, students(name, student_id)')
        .gte('created_at', '2026-03-10T15:00:00Z'); // KST 3월 11일 0시
        
    if (error) console.error(error);
    
    const target = records?.filter(r => r.students?.student_id === '3401');
    console.log('Found 3401 records:', target?.length);
    target?.forEach(r => console.log('ID:', r.id, 'Created:', r.created_at, 'Cat:', r.category, 'Teacher:', r.teacher_email_prefix));
}
run();
