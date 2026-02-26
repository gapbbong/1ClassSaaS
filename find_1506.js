import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function find1506() {
    console.log("--- Searching for student_id 1506 (Academic Year 2025) ---");
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', '1506')
        .eq('academic_year', 2025);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Result for 1506 (2025):", JSON.stringify(data, null, 2));
    }

    console.log("\n--- Searching for student_id 1506 (Any year) ---");
    const { data: any1506, error: anyError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', '1506');

    if (anyError) {
        console.error("Error any:", anyError);
    } else {
        console.log("Result for 1506 (Any year):", JSON.stringify(any1506, null, 2));
    }
}

find1506();
