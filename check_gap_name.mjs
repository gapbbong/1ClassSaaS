import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data: teacher } = await supabase.from('teachers').select('name').eq('email', 'gapbbong@naver.com').single();
    process.stdout.write('NAME_IN_DB:[' + (teacher?.name || 'NOT_FOUND') + ']\n');
}
run();
