import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFix() {
    try {
        console.log("Fetching all presets...");
        const { data, error } = await supabase
            .from('preset_categories')
            .select('*')
            .order('type', { ascending: true })
            .order('display_order', { ascending: true });

        if (error) throw error;

        console.table(data.map(d => ({ type: d.type, item_name: d.item_name, order: d.display_order })));

        const sangdam = data.find(d => d.item_name === "상담" && d.type === "good");
        if (sangdam) {
            console.log("Found '상담' in 'good' deeds. Deleting...");
            const { error: delError } = await supabase
                .from('preset_categories')
                .delete()
                .eq('id', sangdam.id);
            
            if (delError) {
                console.error("Delete error:", delError.message);
            } else {
                console.log("Successfully deleted '상담' from good deeds.");
            }
        } else {
            console.log("'상담' not found in good deeds.");
        }

    } catch (err) {
        console.error(err);
    }
}

checkAndFix();
