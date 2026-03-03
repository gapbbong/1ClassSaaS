
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findStudents(studentId) {
    try {
        const { data: students, error: sError } = await supabase
            .from('students')
            .select('pid, name, class_info, academic_year')
            .eq('student_id', studentId);

        if (sError) throw sError;

        for (const student of students) {
            const { data: survey, error: surveyError } = await supabase
                .from('surveys')
                .select('data')
                .eq('student_pid', student.pid)
                .order('submitted_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const password = survey?.data?.['비밀번호'] || "Not found";
            console.log(`YEAR: ${student.academic_year}, NAME: ${student.name}, PASS: ${password}`);
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

findStudents('1610');
