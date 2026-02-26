import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixKimMinJae() {
    console.log("Starting data fix for 김민재...");

    // 1. Update 2026 record (2501)
    const { error: updateError } = await supabase
        .from('students')
        .update({
            birth_date: '2009-10-06',
            photo_url: 'https://pwyflwjtafarkwbejoen.supabase.co/storage/v1/object/public/student-photos/2025/1506.jpg',
            updated_at: new Date().toISOString()
        })
        .eq('pid', '03f86613-3a4d-417a-aead-394117d206c5');

    if (updateError) {
        console.error("Error updating 2026 record:", updateError);
    } else {
        console.log("Successfully updated 2026 record (2501).");
    }

    // 2. Insert 2025 record (1506)
    const { error: insertError } = await supabase
        .from('students')
        .insert({
            student_id: '1506',
            name: '김민재',
            gender: '남',
            birth_date: '2009-10-06',
            academic_year: 2025,
            class_info: '1-5',
            status: 'active',
            photo_url: 'https://pwyflwjtafarkwbejoen.supabase.co/storage/v1/object/public/student-photos/2025/1506.jpg',
            contact: '01066722133'
        });

    if (insertError) {
        console.error("Error inserting 2025 record:", insertError);
    } else {
        console.log("Successfully inserted 2025 record (1506).");
    }
}

fixKimMinJae();
