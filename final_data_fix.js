import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import iconv from 'iconv-lite';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAll() {
    console.log("Teacher Data Final Fix Started...");

    // 1. Jang Hyo-yoon Add (Missing in DB)
    const { data: jangExisting } = await supabase.from('teachers').select('id').eq('name', '장효윤').maybeSingle();
    if (!jangExisting) {
        console.log("Adding Jang Hyo-yoon (2-6 Homeroom)...");
        await supabase.from('teachers').insert({
            name: '장효윤',
            email: 'jang_hy@school.com', // Placeholder email
            role: 'homeroom_teacher',
            assigned_class: '2-6',
            phone: '010-8713-2882'
        });
    } else {
        await supabase.from('teachers').update({ assigned_class: '2-6', role: 'homeroom_teacher' }).eq('id', jangExisting.id);
    }

    // 2. Lee Gap-jong (3-4 Homeroom) & Jung Go-eun (2-2 Homeroom) assigned_class check
    console.log("Updating Lee Gap-jong and Jung Go-eun...");
    await supabase.from('teachers').update({ assigned_class: '3-4' }).eq('name', '이갑종');
    await supabase.from('teachers').update({ assigned_class: '2-2' }).eq('name', '정고은');

    // 3. Reparse CSV and update ALL Phones + Sub Classes
    const fileBuffer = fs.readFileSync('Teachers.csv');
    const fileContent = iconv.decode(fileBuffer, 'euc-kr');
    const lines = fileContent.split('\n').filter(l => l.trim()).slice(1);

    let count = 0;
    for (const line of lines) {
        const c = line.split(',').map(s => s.trim());
        const email = c[0];
        const name = c[1];
        const hrPhone = c[4] || null;
        const subG = c[5] || null;
        const subC = c[6] || null;
        const subP = c[7] || null;

        const targetEmail = (name === '이갑종' && email === 'serv@kakao.com') ? 'gapbbong@naver.com' : email;

        const { error } = await supabase.from('teachers').update({
            phone: hrPhone || subP,
            sub_grade: subG,
            sub_class: subC
        }).or(`email.eq.${targetEmail},name.eq.${name}`);

        if (!error) count++;
    }

    console.log(`Finished processing CSV. Updated/Verified ${count} records.`);
    console.log("Final Fix Task Completed!");
}

fixAll();
