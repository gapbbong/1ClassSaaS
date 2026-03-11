import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    // 1. 전체 로그 3000개 로드 (admin.html과 동일한 한도)
    const { data: logs } = await supabase.from('user_logs').select('teacher_email').order('created_at', { ascending: false }).limit(3000);
    
    // 2. 관리자(이갑종 선생님) 제외를 위해 이메일 확인
    // gapbbong@naver.com 이 이갑종 선생님 이메일임
    
    const stats = {};
    let totalExcludingAdmin = 0;
    
    logs.forEach(l => {
        if (l.teacher_email !== 'gapbbong@naver.com') {
            stats[l.teacher_email] = (stats[l.teacher_email] || 0) + 1;
            totalExcludingAdmin++;
        }
    });
    
    console.log('--- Log Sum Results (Top 3000) ---');
    console.log('Total logs in range (excluding Admin):', totalExcludingAdmin);
    console.log('Number of active teachers (excluding Admin):', Object.keys(stats).length);
}
run();
