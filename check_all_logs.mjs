import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    console.log('--- User Logs Summary ---');
    const { data: logs, error } = await supabase.from('user_logs').select('teacher_email, created_at').order('created_at', { ascending: false }).limit(100);
    if (error) { console.error(error); return; }
    
    const summary = {};
    logs.forEach(l => {
        summary[l.teacher_email] = (summary[l.teacher_email] || 0) + 1;
    });
    console.log('Log counts by email:', summary);
    if (logs.length > 0) console.log('Latest log email:', logs[0].teacher_email, 'at', logs[0].created_at);
}
run();
