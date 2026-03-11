import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    console.log('--- Searching for Records with Teacher = 오류 ---');
    const { data: recs } = await supabase.from('life_records').select('*').eq('teacher_email_prefix', '오류');
    recs?.forEach(r => console.log('ID:', r.id, 'PID:', r.student_pid, 'Time:', r.created_at, 'Cat:', r.category));

    console.log('--- Searching for Recent User Logs ---');
    const { data: logs } = await supabase.from('user_logs').select('*').order('created_at', { ascending: false }).limit(20);
    logs?.forEach(l => console.log('LogID:', l.id, 'Email:', l.teacher_email, 'Path:', l.page_path, 'Time:', l.created_at));
}
run();
