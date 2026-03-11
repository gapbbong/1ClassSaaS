import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testHeadcountOnly() {
    const { data } = await supabase.from('students').select('*').eq('academic_year', 2026).eq('class_info', '1-5');

    const mapped = data.map(s => {
        const st = String(s.status || "").toLowerCase().trim();
        let hakjeok = "재학";
        if (st === 'active' || st === '재학') hakjeok = '재학';
        else if (st === 'transferred' || st === '전출') hakjeok = '전출';
        else if (st === 'withdrawn' || st === 'dropout' || st === '자퇴') hakjeok = '자퇴';
        return hakjeok;
    });

    const active = mapped.filter(h => h !== '전출' && h !== '자퇴');
    console.log(`TOTAL: ${mapped.length}, ACTIVE: ${active.length}, EXCLUDED: ${mapped.length - active.length}`);
}
testHeadcountOnly();
