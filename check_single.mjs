import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import util from 'util';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSingleInsight() {
    const { data: students } = await supabase.from('students').select('pid, student_id, name').eq('class_info', '1-4');

    if (!students || students.length === 0) return console.log("No students in 1-4");

    // find first student with insight
    const pids = students.map(s => s.pid);
    const { data: insight } = await supabase.from('student_insights').select('content, student_pid').in('student_pid', pids).order('analyzed_at', { ascending: false }).limit(1).single();

    if (insight) {
        const student = students.find(s => s.pid === insight.student_pid);
        console.log(`Student: ${student.student_id} ${student.name}`);
        console.log(util.inspect(insight.content, { depth: null, colors: true }));
    } else {
        console.log("No insight found.");
    }
}
checkSingleInsight();
