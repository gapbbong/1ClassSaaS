import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log("URL:", supabaseUrl);
console.log("Key:", supabaseAnonKey ? "Exists" : "Missing");

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase credentials!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    try {
        const { data, error } = await supabase.from('teachers').select('*').limit(1);
        if (error) throw error;
        console.log("Connection successful! Data:", data);
    } catch (err) {
        console.error("Connection failed:", err.message);
    }
}

test();
