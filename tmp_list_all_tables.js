import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Actually it's service role

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    try {
        const { data, error } = await supabase.rpc('get_table_names'); // Try guessing RPC
        if (!error) {
           console.log("Tables (RPC):", data);
           return;
        }

        // Try direct SQL if possible
        const { data: tables, error: e2 } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');
        if (!e2) {
           console.log("Tables (pg_tables):", tables);
           return;
        }

        console.log("Could not find table list directly. Checking common ones again...");
    } catch (err) {
        console.error(err);
    }
}

listTables();
