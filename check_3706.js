import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testKey = supabaseServiceKey || supabaseAnonKey;

const supabase = createClient(supabaseUrl, testKey);

async function addStudent() {
    console.log("Adding student 3706 이갑종...");

    const { data, error } = await supabase
        .from('students')
        .insert([{
            student_id: '3706',
            name: '이갑종',
            academic_year: 2025,
            class_info: '7-6', // 임의 지정
            status: 'active'
        }])
        .select();

    if (error) {
        console.error("Error adding student:", error);
        return;
    }

    console.log("Successfully added student:", data);
}

addStudent();
