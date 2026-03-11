import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const pid = '92837f61-71fb-4813-8197-b2a74a7a6367';
    console.log('--- Records for PID:', pid, '---');
    const { data: recs, error } = await supabase.from('life_records').select('*').eq('student_pid', pid).order('created_at', { ascending: false });
    if (error) console.error(error);
    recs?.forEach(r => console.log('ID:', r.id, 'Time:', r.created_at, 'Cat:', r.category, 'Teacher:', r.teacher_email_prefix));
}
run();
