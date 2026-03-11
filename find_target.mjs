import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data: recs } = await supabase.from('life_records').select('*').ilike('category', '%Áö°¢%').order('created_at', { ascending: false }).limit(5);
    recs?.forEach(r => console.log('MATCH_RECO:', r.id, r.category, r.created_at, r.teacher_email_prefix));
}
run();
