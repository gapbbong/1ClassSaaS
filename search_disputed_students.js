import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    const names = ['김재안', '김윤우', '임현묵', '이정민'];
    console.log(`🔍 중복 의심 학생 (${names.join(', ')}) 전역 검색...`);

    for (const name of names) {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('academic_year', 2026)
            .eq('name', name);

        if (error) console.error(`❌ ${name} 검색 실패:`, error.message);
        else {
            console.log(`\n--- [성명: ${name}] ---`);
            data.forEach(s => {
                console.log(`[pid: ${s.pid}] 학급: ${s.class_info}, 학번: ${s.student_id}, 사진: ${s.photo_url ? 'O' : 'X'}`);
            });
        }
    }
})();
