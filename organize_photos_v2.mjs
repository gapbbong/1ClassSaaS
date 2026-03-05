import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const srcDir = 'D:/App/1cl/25 학생 사진/25 학생';
const baseDestDir = 'D:/App/1cl/26 학생 사진/2학년';

async function organizeFinal() {
    console.log('Fetching 2026 student data...');
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
        if (!fs.existsSync(baseDestDir)) {
            fs.mkdirSync(baseDestDir, { recursive: true });
        }

        const files = fs.readdirSync(srcDir);
        let count = 0;

        files.forEach(filename => {
            // 2025 1학년 = 2026 2학년
            if (filename.startsWith('1') && filename.toLowerCase().endsWith('.jpg')) {
                const oldId = filename.split('.')[0];
                if (oldId.length === 4) {
                    const classNum = oldId[1];
                    const newId = '2' + oldId.substring(1);
                    const name = nameMap[newId];

                    if (name) {
                        const newFilename = `${newId}${name}.JPG`;
                        const destSubDir = path.join(baseDestDir, `2학년${classNum}반`);

                        if (!fs.existsSync(destSubDir)) {
                            fs.mkdirSync(destSubDir, { recursive: true });
                        }

                        const srcPath = path.join(srcDir, filename);
                        const destPath = path.join(destSubDir, newFilename);

                        fs.copyFileSync(srcPath, destPath);
                        console.log(`Saved: ${newFilename} to 2학년${classNum}반`);
                        count++;
                    }
                }
            }
        });

        console.log(`Successfully organized ${count} photos in '학번이름.JPG' format.`);
    } catch (err) {
        console.error('Error during organization:', err);
    }
}

organizeFinal();
