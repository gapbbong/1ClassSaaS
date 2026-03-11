import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function cleanupNames() {
    const { data: students, error } = await supabase
        .from('students')
        .select('pid, name')
        .eq('academic_year', 2026);

    if (error) { console.error(error); return; }

    const withSpaces = students.filter(s => s.name && s.name.includes(' '));
    console.log(`Cleaning up ${withSpaces.length} names with spaces...`);

    for (const s of withSpaces) {
        const newName = s.name.replace(/\s+/g, '');
        console.log(`- [${s.name}] -> [${newName}]`);
        await supabase.from('students').update({ name: newName }).eq('pid', s.pid);
    }

    console.log("Cleanup finished.");
}

cleanupNames();
