import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findKang() {
    const { data } = await supabase.from('students').select('name, academic_year, class_info, status').eq('name', '강태윤');
    console.log(JSON.stringify(data, null, 2));
}
findKang();
