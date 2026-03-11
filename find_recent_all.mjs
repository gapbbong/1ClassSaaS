import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    console.log('--- Searching for 3401 records ---');
    // student_pid를 직접 입력하지 않고, student_id 필터링을 조인으로 시도
    const { data: records, error } = await supabase
        .from('life_records')
        .select('*, students(student_id, academic_year)')
        .order('created_at', { ascending: false })
        .limit(100);
        
    const filtered = records?.filter(r => r.students?.student_id === '3401');
    console.log('Recent 100 recs from 3401 count:', filtered?.length);
    filtered?.forEach(r => console.log('ID:', r.id, 'Year:', r.students.academic_year, 'Time:', r.created_at, 'Cat:', r.category, 'Teacher:', r.teacher_email_prefix));
}
run();
