import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: d1 } = await supabase.from('teachers').select('email').eq('name', '장효윤');
    console.log('장효윤:', d1 && d1.length > 0 ? d1[0].email : 'Not found');

    const { data: d2 } = await supabase.from('teachers').select('email').eq('name', '정고은');
    console.log('정고은:', d2 && d2.length > 0 ? d2[0].email : 'Not found');
}
run();
