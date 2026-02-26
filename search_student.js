import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function search() {
    const name = process.argv[2] || '강';
    console.log(`🔎 '${name}' 검색 중...`);
    const { data, error } = await supabase
        .from('students')
        .select('pid, name, student_id, academic_year, status, class_info')
        .ilike('name', `%${name}%`);

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}
search();
