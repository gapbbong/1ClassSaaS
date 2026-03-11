import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTable() {
    const { data, error } = await supabase.from('preset_categories').select('*').limit(1);
    if (!error) console.log("FOUND: preset_categories");

    const { data: d2, error: e2 } = await supabase.from('life_records_presets').select('*').limit(1);
    if (!e2) console.log("FOUND: life_records_presets");

    const { data: d3, error: e3 } = await supabase.from('choices').select('*').limit(1);
    if (!e3) console.log("FOUND: choices");

    const { data: d4, error: e4 } = await supabase.from('good_deeds').select('*').limit(1);
    if (!e4) console.log("FOUND: good_deeds");

    const { data: d5, error: e5 } = await supabase.from('bad_deeds').select('*').limit(1);
    if (!e5) console.log("FOUND: bad_deeds");
    
    // Check if there are any unconventional tables
    const randoms = ['items', 'list', 'data', 'master', 'codes'];
    for (const r of randoms) {
        const { error } = await supabase.from(r).select('*').limit(1);
        if (!error) console.log(`FOUND: ${r}`);
    }
}

findTable();
