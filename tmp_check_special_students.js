import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSpecialStudents() {
    try {
        const { data, error } = await supabase.from('students').select('*').not('student_id', 'ilike', '1%').not('student_id', 'ilike', '2%').not('student_id', 'ilike', '3%');
        if (data) {
            console.log("Special students:", data);
        }
    } catch (err) {
        console.error(err);
    }
}

checkSpecialStudents();
