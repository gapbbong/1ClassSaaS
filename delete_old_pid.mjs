import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const pid2025 = '4a75fe5a-9986-46f1-91f6-c74097b4db125';
    const pid2026 = '92837f61-71fb-4813-8197-b2a74a7a6367';
    console.log('--- Deleting today records for both PIDs ---');
    const { data, error } = await supabase
        .from('life_records')
        .delete()
        .in('student_pid', [pid2025, pid2026])
        .gte('created_at', '2026-03-10T15:00:00Z') // KST 3¿ù 11ÀÏ 0½Ã
        .select();
    
    if (error) console.error(error);
    console.log('Deleted count:', data?.length || 0);
    data?.forEach(r => console.log('Deleted ID:', r.id, 'PID:', r.student_pid, 'Time:', r.created_at, 'Cat:', r.category));
}
run();
