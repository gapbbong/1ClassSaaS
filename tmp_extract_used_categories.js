import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getUsedCategories() {
    try {
        console.log("📡 Extracting used categories from 'life_records' table...");
        const { data, error } = await supabase.from('life_records').select('category, is_positive');
        if (error) throw error;
        
        const good = {};
        const bad = {};
        const neutral = {};
        
        data.forEach(r => {
            const cat = r.category;
            if (r.is_positive) {
                good[cat] = (good[cat] || 0) + 1;
            } else {
                bad[cat] = (bad[cat] || 0) + 1;
            }
        });
        
        console.log("✅ Good Categories (Sorted by usage):");
        console.log(Object.entries(good).sort((a,b) => b[1] - a[1]));
        
        console.log("✅ Bad Categories (Sorted by usage):");
        console.log(Object.entries(bad).sort((a,b) => b[1] - a[1]));
    } catch (err) {
        console.error(err);
    }
}

getUsedCategories();
