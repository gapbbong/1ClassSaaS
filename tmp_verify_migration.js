import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
    console.log("Verifying data in 'preset_categories'...");
    try {
        const { data, error, count } = await supabase
            .from('preset_categories')
            .select('*', { count: 'exact' });

        if (error) {
            console.error("❌ Error fetching data:", error.message);
        } else {
            console.log(`✅ Success! Total rows found: ${count}`);
            if (data.length > 0) {
                console.log("Sample row:", data[0]);
            } else {
                console.log("⚠️ No rows found. Migration might have failed or RLS is blocking access.");
            }
        }
    } catch (err) {
        console.error("💥 Critical error:", err.message);
    }
}

verifyMigration();
