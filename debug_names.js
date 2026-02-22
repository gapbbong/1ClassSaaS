import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkNames() {
    const { data, error } = await supabase
        .from('students')
        .select('student_id, name')
        .limit(10);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Students:", JSON.stringify(data, null, 2));
    }
}

checkNames();
