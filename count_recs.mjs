import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { count } = await supabase.from('life_records').select('*', { count: 'exact', head: true });
    console.log('TOTAL_RECORDS:', count);
}
run();
