import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { data: all } = await supabase.from('teachers').select('*');
    if (!all) { console.log('RESULT: []'); return; }
    const gaps = all.filter(t => t.name.includes('갑종') || t.email.includes('gapbbong'));
    console.log('RESULT:', JSON.stringify(gaps, null, 2));
}
run();
