import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    // 1. 전체 교사 로드
    const { data: teachers } = await supabase.from('teachers').select('email, name');
    
    // 2. 관리자(이갑종 선생님) 제외 위해 name 필터링도 동일하게 적용
    const teacherAnalysis = {};
    teachers.forEach(t => {
        if (t.name === '이갑종') return;
        teacherAnalysis[t.email] = { name: t.name, total: 0 };
    });

    // 3. 로그 로드
    const { data: rawData } = await supabase.from('user_logs').select('teacher_email').order('created_at', { ascending: false }).limit(3000);
    const data = rawData.reverse();

    // 4. 분석 수행
    data.forEach(log => {
        const email = log.teacher_email;
        const tData = teacherAnalysis[email];
        if (tData) {
            tData.total++;
        }
    });

    // 5. 합산
    let sum = 0;
    Object.values(teacherAnalysis).forEach(t => {
        sum += t.total;
    });

    console.log('Total sum of activities:', sum);
}
run();
