
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findStudentPassword(studentId) {
    try {
        const { data: student, error: sError } = await supabase
            .from('students')
            .select('pid, name, class_info')
            .eq('student_id', studentId)
            .eq('academic_year', 2026)
            .maybeSingle();

        if (sError) throw sError;
        if (!student) {
            console.log("Student not found.");
            return;
        }

        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('data')
            .eq('student_pid', student.pid)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (surveyError) throw surveyError;
        if (!survey) {
            console.log(`No survey found for ${student.name} (${studentId})`);
            return;
        }

        const password = survey.data['비밀번호'] || survey.data['password'] || "Not found";
        console.log(`STUDENT_NAME: ${student.name}`);
        console.log(`STUDENT_PASS: ${password}`);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

findStudentPassword('1610');
