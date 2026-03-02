import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Get pid for 3403
    const { data: students, error: err1 } = await supabase.from('students').select('pid').eq('student_id', '3403');
    if (err1 || !students || students.length === 0) {
        console.error('Failed to find student 3403', err1);
        return;
    }
    const pid = students[0].pid;
    console.log('Found pid for 3403:', pid);

    // 2. Delete survey
    const { error: err2 } = await supabase.from('surveys').delete().eq('student_pid', pid);
    if (err2) {
        console.error('Failed to delete survey', err2);
    } else {
        console.log('Successfully deleted survey for 3403');
    }
}

run();
