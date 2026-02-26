import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkKimMinJae() {
    console.log("Searching for 김민재...");

    // Check Current Students (2026 likely)
    const { data: currentStudents, error: currError } = await supabase
        .from('students')
        .select('*')
        .ilike('name', '%김민재%');

    if (currError) {
        console.error("Current Students Error:", currError);
    } else {
        console.log("Current Students (2026):", JSON.stringify(currentStudents, null, 2));
    }

    // Check Student History (2025 likely)
    const { data: historyStudents, error: histError } = await supabase
        .from('student_history')
        .select('*')
        .ilike('name', '%김민재%');

    if (histError) {
        console.error("Student History Error:", histError);
    } else {
        console.log("Student History (2025):", JSON.stringify(historyStudents, null, 2));
    }
}

checkKimMinJae();
