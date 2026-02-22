import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncTeacher() {
    const email = 'janghyt@kse.hs.kr';
    const name = '장효윤';
    const assigned_class = '2-6';
    const phone = '010-8713-6255';

    console.log(`Checking for teacher: ${email}`);

    // 1. Check if teacher exists
    const { data: teacher, error: selectError } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (selectError) {
        console.error("Error querying teachers table:", selectError);
    }

    if (teacher) {
        console.log(`Teacher found with id ${teacher.id}. Updating details...`);
        const { error: updateError } = await supabase
            .from('teachers')
            .update({
                name: name,
                assigned_class: assigned_class,
                phone: phone,
                role: 'homeroom_teacher'
            })
            .eq('id', teacher.id);

        if (updateError) {
            console.error("Update failed:", updateError);
        } else {
            console.log("Teacher successfully updated.");
        }
    } else {
        console.log("Teacher not found in 'teachers' table. Attempting to create user...");
        // Use auth.admin to create user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: 'password123!',
            email_confirm: true,
            user_metadata: { name: name }
        });

        if (authError) {
            console.error("Error creating auth user:", authError);
            return;
        }

        console.log(`Auth user created with id: ${authData.user.id}. Waiting for trigger...`);

        // Wait a bit for the trigger to insert into teachers table
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log("Updating teachers table with assigned class and phone...");
        const { error: finalUpdateError } = await supabase
            .from('teachers')
            .update({
                assigned_class: assigned_class,
                phone: phone,
                role: 'homeroom_teacher'
            })
            .eq('id', authData.user.id);

        if (finalUpdateError) {
            console.error("Failed to update additional data:", finalUpdateError);
        } else {
            console.log("Teacher successfully added and configured.");
        }
    }
}

syncTeacher();
