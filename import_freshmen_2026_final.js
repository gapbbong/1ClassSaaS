import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function importFreshmen() {
    const rawData = fs.readFileSync('freshmen_2026_raw.txt', 'utf-8');
    const lines = rawData.split('\n');
    const studentsToInsert = [];

    console.log(`Processing ${lines.length} lines...`);

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Pattern: Grade Dept Class Number Name Birth Gender ...
        // Using a more flexible split or regex
        // Example: 1학년	IOT전기과	1 	1 	감찬우		2010.03.17.		남

        // Let's try to match the key parts
        const match = line.match(/^1학년\s+([^\t\n\r]+)\s+(\d+)\s+(\d+)\s+([\s\S]+?)\s+(\d{4}\.\d{2}\.\d{2}\.)\s+([남여])/);

        if (match) {
            const [_, dept, classNum, sNum, name, birth, gender] = match;

            // Format ID: 1 + class(1 digit) + number(2 digits) -> e.g., 1101
            // Note: If class is 10+, this might change, but here it's 1-6.
            const student_id = `1${classNum}${sNum.padStart(2, '0')}`;
            const formattedBirth = birth.replace(/\./g, '-').replace(/-$/, ''); // 2010.03.17. -> 2010-03-17

            studentsToInsert.push({
                student_id,
                name: name.trim(),
                birth_date: formattedBirth,
                gender: gender === '남' ? '남' : '여',
                academic_year: 2026,
                class_info: `1-${classNum}`,
                status: 'active',
                photo_url: null
            });
        } else {
            // Check if it's a line with '-' for score like 정채은 line
            // 1학년	게임콘텐츠과	5 	18 	정채은		2009.12.05.		여
            const altMatch = line.match(/^1학년\s+([^\t\n\r]+)\s+(\d+)\s+(\d+)\s+([\s\S]+?)\s+(\d{4}\.\d{2}\.\d{2}\.)\s+([남여])/);
            if (!altMatch) {
                console.warn("Skipping line (no match):", line);
            }
        }
    }

    console.log(`Prepared ${studentsToInsert.length} students for import.`);

    if (studentsToInsert.length === 0) {
        console.error("No students parsed. check regex.");
        return;
    }

    // Bulk Insert
    const { data, error } = await supabase
        .from('students')
        .insert(studentsToInsert);

    if (error) {
        console.error("Error during bulk insert:", error);
    } else {
        console.log(`Successfully imported ${studentsToInsert.length} freshmen.`);
    }
}

importFreshmen();
