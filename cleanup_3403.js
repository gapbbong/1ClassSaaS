import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Cleaning up 3403 (김민준) ---');

    // 1. Find all student PIDs for 3403
    const { data: students, error: sErr } = await supabase
        .from('students')
        .select('pid, name, academic_year, class_info')
        .eq('student_id', '3403');

    if (sErr) { console.error('Student fetch error:', sErr); return; }
    if (!students || students.length === 0) { console.log('No student found with ID 3403'); return; }

    console.log('Found students:', students);

    for (const student of students) {
        const pid = student.pid;
        console.log(`Checking PID: ${pid} (${student.academic_year}, ${student.class_info})`);

        // Check surveys
        const { data: surveys } = await supabase.from('surveys').select('*').eq('student_pid', pid);
        console.log(`Surveys for ${pid}:`, surveys);
        if (surveys && surveys.length > 0) {
            const { error: dErr } = await supabase.from('surveys').delete().eq('student_pid', pid);
            if (dErr) console.error(`Delete survey error for ${pid}:`, dErr);
            else console.log(`Deleted surveys for ${pid}`);
        }

        // Check student_insights
        const { data: insights } = await supabase.from('student_insights').select('*').eq('student_pid', pid);
        console.log(`Insights for ${pid}:`, insights);
        if (insights && insights.length > 0) {
            const { error: iErr } = await supabase.from('student_insights').delete().eq('student_pid', pid);
            if (iErr) console.error(`Delete insight error for ${pid}:`, iErr);
            else console.log(`Deleted insights for ${pid}`);
        }
    }

    console.log('--- Cleanup Complete ---');
}

run();
