import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log("🔍 특정 학급(2-1, 2-2, 2-5) 데이터 진단 시작...");

    const classes = ['2-1', '2-2', '2-5'];

    for (const cls of classes) {
        console.log(`\n--- [학급: ${cls}] ---`);
        const { data, error } = await supabase
            .from('students')
            .select('pid, name, student_id, class_info, photo_url')
            .eq('academic_year', 2026)
            .eq('class_info', cls)
            .order('student_id', { ascending: true });

        if (error) {
            console.error(`❌ ${cls} 데이터 조회 실패:`, error.message);
            continue;
        }

        data.forEach(s => {
            const num = s.student_id ? parseInt(s.student_id.slice(-2)) : 0;
            console.log(`[pid: ${s.pid}] 번호: ${num}, 성명: ${s.name}, 학번: ${s.student_id}, 사진: ${s.photo_url ? 'O' : 'X'}`);
        });
    }
})();
