import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const baseDir = 'D:/App/1cl/26 학생 사진/2학년';

async function renamePhotosWithNames() {
    console.log('Fetching student data...');
    const { data: students, error } = await supabase
        .from('students')
        .select('student_id, name')
        .eq('academic_year', 2026);

    if (error) {
        console.error('Error fetching students:', error.message);
        return;
    }

    const nameMap = {};
    students.forEach(s => {
        nameMap[s.student_id] = s.name;
    });

    try {
        if (!fs.existsSync(baseDir)) {
            console.error(`Directory not found: ${baseDir}`);
            return;
        }

        const classDirs = fs.readdirSync(baseDir);
        let count = 0;

        for (const classDir of classDirs) {
            const classPath = path.join(baseDir, classDir);
            if (fs.statSync(classPath).isDirectory()) {
                const files = fs.readdirSync(classPath);

                for (const filename of files) {
                    if (filename.endsWith('.jpg') && !filename.includes('_')) {
                        const studentId = filename.split('.')[0];
                        const studentName = nameMap[studentId];

                        if (studentName) {
                            const newFilename = `${studentId}_${studentName}.jpg`;
                            const oldPath = path.join(classPath, filename);
                            const newPath = path.join(classPath, newFilename);

                            fs.renameSync(oldPath, newPath);
                            console.log(`Renamed: ${filename} -> ${newFilename}`);
                            count++;
                        } else {
                            console.warn(`Name not found for ID: ${studentId}`);
                        }
                    }
                }
            }
        }

        console.log(`Successfully renamed ${count} photo files.`);
    } catch (err) {
        console.error('Error during renaming:', err);
    }
}

renamePhotosWithNames();
