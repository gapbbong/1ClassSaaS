import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data: d1 } = await supabase.from('user_logs').select('*').limit(3000);
    console.log('d1 length:', d1.length);
}
run();
