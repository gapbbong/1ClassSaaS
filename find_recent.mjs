import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    console.log('Searching since:', fourHoursAgo);
    
    const { data: records, error } = await supabase
        .from('life_records')
        .select('*, students(student_id, name)')
        .gte('created_at', fourHoursAgo)
        .order('created_at', { ascending: false });
        
    if (error) console.error(error);
    
    records?.forEach(r => {
        console.log('ID:', r.id, 'Student:', r.students?.student_id, 'Name:', r.students?.name, 'Time:', r.created_at, 'Cat:', r.category, 'Teacher:', r.teacher_email_prefix);
    });
}
run();
