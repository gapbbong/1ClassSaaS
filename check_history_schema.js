import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkHistorySchema() {
    console.log("--- student_history table info ---");
    const { data: sample, error } = await supabase
        .from('student_history')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching sample:", error);
        return;
    }

    if (sample && sample.length > 0) {
        console.log("Sample row keys:", Object.keys(sample[0]));
        console.log("Sample data:", JSON.stringify(sample[0], null, 2));
    } else {
        console.log("Table 'student_history' is empty.");
    }

    // Try to find by student_id 1506 regardless of names
    console.log("\n--- Searching for student_id 1506 in student_history ---");
    const { data: hist1506, error: histError } = await supabase
        .from('student_history')
        .select('*')
        .eq('student_id', '1506');

    if (histError) {
        console.error("Error searching hist 1506:", histError);
    } else {
        console.log("Result for 1506 in history:", JSON.stringify(hist1506, null, 2));
    }

    // Also search for Kim Min-jae if name column exists but maybe named differently?
    // Let's just search for any rows with 1506 first.
}

checkHistorySchema();
