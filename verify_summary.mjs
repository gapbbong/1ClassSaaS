import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    // 1. 교찰 목록
    const { data: teachers } = await supabase.from('teachers').select('email, name');
    const teacherEmails = new Set(teachers.map(t => t.email));
    
    // 2. 최근 로그 3000개
    const { data: logs } = await supabase.from('user_logs').select('teacher_email').order('created_at', { ascending: false }).limit(3000);
    
    console.log('--- Verification Report ---');
    const logEmails = new Set(logs.map(l => l.teacher_email));
    
    let missingCount = 0;
    logEmails.forEach(email => {
        if (!teacherEmails.has(email)) {
            console.log('MISSING TEACHER RECORD FOR LOG EMAIL:', email);
            missingCount++;
        }
    });
    
    if (missingCount === 0) {
        console.log('All log emails have corresponding teacher records.');
    } else {
        console.log('Total missing teachers:', missingCount);
    }
    
    // 이갑종 선생님 제외 로직 확인
    const includesGap = teacherEmails.has('gapbbong@naver.com');
    console.log('gapbbong@naver.com exists in teachers table:', includesGap);
}
run();
