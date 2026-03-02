import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: d } = await supabase.from('teachers').select('name, email, role, assigned_class').eq('name', '이갑종');
    console.log('SEARCH_RESULT:', JSON.stringify(d, null, 2));
}
run();
