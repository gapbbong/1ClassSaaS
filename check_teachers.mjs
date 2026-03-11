import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data, error } = await supabase.from('teachers').select('*');
    if (error) { console.error(error); return; }
    console.log('--- Teachers List ---');
    data.forEach(t => console.log(t.name, t.email, t.role));
}
run();
