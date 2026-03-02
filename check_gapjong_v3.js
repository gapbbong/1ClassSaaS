import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: d1 } = await supabase.from('teachers').select('name, email, role, assigned_class').eq('name', '이갑종');
    console.log('NAME_SEARCH:', d1);

    const { data: d2 } = await supabase.from('teachers').select('name, email, role, assigned_class').ilike('email', '%gapbbong%');
    console.log('EMAIL_SEARCH:', d2);
}
run();
