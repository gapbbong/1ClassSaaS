import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
    const tables = ['settings', 'common_codes', 'preset_categories', 'good_bad_list', 'categories'];
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`❌ Table '${table}' error: ${error.message}`);
            } else {
                console.log(`✅ Table '${table}' exists! Data:`, data);
            }
        } catch (err) {
            console.log(`💥 Table '${table}' failed: ${err.message}`);
        }
    }
}

checkTables();
