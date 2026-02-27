import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findDuplicateNames() {
    console.log("Searching for duplicate names in Grade 1 (2026)...");

    const { data: students, error } = await supabase
        .from('students')
        .select('name, student_id, class_info')
        .eq('academic_year', 2026)
        .ilike('class_info', '1-%');

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
        console.log("No duplicate names found in Grade 1.");
    } else {
        console.log("--- Duplicate Names Found ---");
        duplicates.forEach(d => {
            console.log(`\nName: ${d.name} (${d.list.length} students)`);
            d.list.forEach(item => {
                console.log(`  - Class ${item.class}, ID: ${item.id}`);
            });
        });
    }
}

findDuplicateNames();
