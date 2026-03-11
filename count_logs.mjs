import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { count, error } = await supabase.from('user_logs').select('*', { count: 'exact', head: true });
    console.log('TOTAL_LOGS_COUNT:', count);
}
run();
