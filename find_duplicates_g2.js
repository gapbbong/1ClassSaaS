import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findDuplicateNamesG2() {
    console.log("Searching for duplicate names in Grade 2 (2026)...");

    const { data: students, error } = await supabase
        .from('students')
        .select('name, student_id, class_info')
        .eq('academic_year', 2026)
        .ilike('class_info', '2-%');

    if (error) {
        console.error("Error fetching students:", error);
        return;
    }

    const nameGroups = {};
    students.forEach(s => {
        if (!nameGroups[s.name]) {
            nameGroups[s.name] = [];
        }
        nameGroups[s.name].push({ id: s.student_id, class: s.class_info });
    });

    const duplicates = Object.entries(nameGroups)
        .filter(([name, list]) => list.length > 1)
        .map(([name, list]) => ({ name, list }));

    if (duplicates.length === 0) {
        console.log("No duplicate names found in Grade 2.");
    } else {
        console.log("--- Duplicate Names Found in Grade 2 ---");
        duplicates.forEach(d => {
            console.log(`\nName: ${d.name} (${d.list.length} students)`);
            d.list.forEach(item => {
                console.log(`  - Class ${item.class}, ID: ${item.id}`);
            });
        });
    }
}

findDuplicateNamesG2();
