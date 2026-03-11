import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAllTables() {
    try {
        // RPC might not exist, but let's try a direct query on a common table
        // Or try to select from something that might fail but give a hint
        const { data, error } = await supabase.from('students').select('count', { count: 'exact', head: true });
        console.log("Supabase connection ok.");
        
        // Let's try to guess the settings table by checking common names
        const guesses = ['settings', 'categories', 'good_bad', 'presets', 'config', 'app_config', 'site_settings'];
        for (const g of guesses) {
            const { error: e } = await supabase.from(g).select('*').limit(1);
            if (!e) {
                console.log(`Bingo! Table found: ${g}`);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

listAllTables();
