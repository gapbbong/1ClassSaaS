import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeacher() {
    const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', 'gapbbong@naver.com');

    if (error) {
        console.error(error);
    } else {
        console.log("DB info:", data);
    }
}
checkTeacher();
