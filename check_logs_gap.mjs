import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    console.log('--- Checking for logs after 08:56 AM KST today ---');
    // 08:56 KST is 23:56 UTC (previous day)
    const targetTime = '2026-03-10T23:56:00Z'; 
    const { data: logs, error } = await supabase
        .from('user_logs')
        .select('*')
        .gte('created_at', targetTime)
        .order('created_at', { ascending: true });
        
    if (error) { console.error(error); return; }
    
    console.log('Total logs found after target time:', logs?.length);
    logs.slice(0, 10).forEach(l => console.log('Log:', l.created_at, l.teacher_email, l.page_path));
    if (logs.length > 10) {
        console.log('...');
        logs.slice(-10).forEach(l => console.log('Log:', l.created_at, l.teacher_email, l.page_path));
    }
}
run();
