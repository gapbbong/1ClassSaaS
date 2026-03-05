import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const srcDir = 'D:/App/1cl/25 학생 사진/25 학생';
const baseDestDir = 'D:/App/1cl/26 학생 사진/2학년';

async function organizeAccurate() {
    console.log('Fetching 2026 2nd grade students from database...');
    const { data: students, error } = await supabase
        .from('students')
        .select('student_id, name, photo_url, class_info')
        .eq('academic_year', 2026)
        .ilike('student_id', '2%');

    if (error) {
        console.error('Error fetching students:', error.message);
        return;
    }

    console.log(`Found ${students.length} students in 2nd grade.`);

    try {
        if (!fs.existsSync(baseDestDir)) {
            fs.mkdirSync(baseDestDir, { recursive: true });
        }

        let successCount = 0;
        let failCount = 0;

        for (const student of students) {
            if (!student.photo_url) {
                console.warn(`No photo_url for ${student.student_id} ${student.name}`);
                failCount++;
                continue;
            }

            // Extract filename from URL: https://.../admin/student-photos/2025/1120.jpg -> 1120.jpg
            const urlParts = student.photo_url.split('/');
            const originalFilename = urlParts[urlParts.length - 1]; // e.g., 1120.jpg

            const srcPath = path.join(srcDir, originalFilename);

            if (fs.existsSync(srcPath)) {
                const classNum = student.class_info.split('-')[1];
                const destSubDir = path.join(baseDestDir, `2학년${classNum}반`);

                if (!fs.existsSync(destSubDir)) {
                    fs.mkdirSync(destSubDir, { recursive: true });
                }

                const newFilename = `${student.student_id}${student.name}.JPG`;
                const destPath = path.join(destSubDir, newFilename);

                fs.copyFileSync(srcPath, destPath);
                console.log(`Copied: ${originalFilename} -> ${newFilename} (Class ${student.class_info})`);
                successCount++;
            } else {
                console.warn(`Source photo not found: ${srcPath} for student ${student.student_id}`);
                failCount++;
            }
        }

        console.log('\n--- Organization Summary ---');
        console.log(`Successfully organized: ${successCount}`);
        console.log(`Failed/Missing: ${failCount}`);
        console.log(`Total processed: ${students.length}`);
    } catch (err) {
        console.error('Error during organization:', err);
    }
}

organizeAccurate();
