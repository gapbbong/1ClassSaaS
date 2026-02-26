import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyImport() {
    console.log("Verifying 2026 Freshmen Import...");

    const { data, count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('academic_year', 2026)
        .ilike('class_info', '1-%');

    if (error) {
        console.error("Verification Error:", error);
    } else {
        console.log(`Verified Count (2026 Grade 1): ${count}`);
    }

    // Check unique classes
    const { data: classes, error: classError } = await supabase
        .from('students')
        .select('class_info')
        .eq('academic_year', 2026)
        .ilike('class_info', '1-%');

    if (!classError) {
        const uniqueClasses = [...new Set(classes.map(c => c.class_info))].sort();
        console.log("Registered Classes:", uniqueClasses.join(', '));
    }
}

verifyImport();
