import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findTable() {
    const nouns = ['good', 'bad', 'record', 'preset', 'setting', 'category', 'deed', 'action', 'common', 'code', 'choice', 'option'];
    const suffixes = ['', 's', '_items', '_list', '_entries', '_data', '_presets', '_settings', '_codes'];
    
    const candidates = [];
    for (const n of nouns) {
        for (const s of suffixes) {
            candidates.push(n + s);
        }
    }
    
    console.log(`Checking ${candidates.length} candidates...`);
    
    // Check in small batches to avoid rate limit or timeout
    for (let i = 0; i < candidates.length; i += 10) {
        const batch = candidates.slice(i, i + 10);
        await Promise.all(batch.map(async (t) => {
            const { error } = await supabase.from(t).select('*').limit(1);
            if (!error) {
                console.log(`🎯 FOUND TABLE: ${t}`);
            }
        }));
    }
}

findTable();
