import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data: records, error } = await supabase
        .from('life_records')
        .select('*, students(name, student_id)')
        .order('created_at', { ascending: false })
        .limit(10);
        
    records?.forEach(r => console.log('ID:', r.id, 'S:', r.students?.student_id, 'Created:', r.created_at, 'Cat:', r.category, 'T:', r.teacher_email_prefix));
}
run();
