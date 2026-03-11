import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
console.log('URL:', process.env.VITE_SUPABASE_URL);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data, error } = await supabase.from('students').select('count', { count: 'exact', head: true });
    console.log('Count:', data, 'Error:', error);
}
run();
