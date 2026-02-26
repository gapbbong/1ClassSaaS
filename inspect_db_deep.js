import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectDatabase() {
    // 1. List all Kim Min-jaes in students table
    console.log("--- All Kim Min-jaes in 'students' table ---");
    const { data: allKim, error: allError } = await supabase
        .from('students')
        .select('*')
        .ilike('name', '%김민재%');

    if (allError) console.error(allError);
    else console.log(JSON.stringify(allKim, null, 2));

    // 2. Search for student_id '1506' or '2501' specifically
    console.log("\n--- Searching for student_id 1506 or 2501 ---");
    const { data: specificIds, error: specError } = await supabase
        .from('students')
        .select('*')
        .in('student_id', ['1506', '2501']);

    if (specError) console.error(specError);
    else console.log(JSON.stringify(specificIds, null, 2));

    // 3. Try to find other tables (this is a bit hacky with Supabase JS, easier to just try common names)
    const tables = ['student_history', 'archives', 'graduates'];
    for (const table of tables) {
        console.log(`\n--- Checking table: ${table} ---`);
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table '${table}' not found or error: ${error.message}`);
        } else {
            console.log(`Table '${table}' exists.`);
            // Search for Kim Min-jae if table exists
            const { data: searchData, error: searchError } = await supabase
                .from(table)
                .select('*')
                .ilike('name', '%김민재%');
            if (!searchError) console.log(JSON.stringify(searchData, null, 2));
        }
    }
}

inspectDatabase();
