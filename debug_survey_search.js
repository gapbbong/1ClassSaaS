import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugStudentSearch() {
    const testIds = ['1101', '1102', '1201']; // 1학년 학번 예시

    for (const id of testIds) {
        console.log(`\n--- Testing Student ID: ${id} ---`);
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('student_id', id);

        if (error) {
            console.error(`Error fetching student ${id}:`, error);
        } else {
            console.log(`Found ${data.length} records for ${id}`);
            data.forEach(s => {
                console.log(`  - Name: ${s.name}, Year: ${s.academic_year}, Class: ${s.class_info}, PID: ${s.pid}`);
            });
        }
    }
}

debugStudentSearch();
