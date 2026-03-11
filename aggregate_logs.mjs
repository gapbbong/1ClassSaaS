import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    // 1. 교사 정보 로드 (이갑종 선생님 제외용)
    const { data: teachers } = await supabase.from('teachers').select('email, name');
    const teacherMap = {};
    teachers.forEach(t => {
        teacherMap[t.email] = t.name;
    });

    // 2. 최근 로그 3000개 로드 (현재 전체가 1578건이므로 전체가 로드됨)
    const { data: logs, error } = await supabase
        .from('user_logs')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) { console.error(error); return; }

    let totalActivities = 0;
    let totalStaySeconds = 0;
    const activeTeachers = new Set();
    const pageStats = {};

    logs.forEach((log, i) => {
        const email = log.teacher_email;
        if (teacherMap[email] === '이갑종') return; // 이갑종 선생님 제외 (검증 로직과 동일)

        totalActivities++;
        activeTeachers.add(email);

        // 페이지 통계
        let page = log.page_path.split('/').pop() || '홈';
        if (page === 'index.html' || page === '') page = '메인 홈';
        pageStats[page] = (pageStats[page] || 0) + 1;

        // 체류 시간 계산 (동일 로직: 300초 이내 다음 로그가 있으면 그 차이를 체류 시간으로 인정)
        const next = logs.find((l, idx) => idx > i && l.teacher_email === email);
        if (next) {
            const diff = (new Date(next.created_at) - new Date(log.created_at)) / 1000;
            if (diff < 1800) { // 30분 이내
                totalStaySeconds += diff;
            }
        }
    });

    const formatTime = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return h > 0 ? h + '시간 ' + m + '분' : m + '분';
    };

    console.log('--- Total Summary (Excluding Admin) ---');
    console.log('활동 선생님 수:', activeTeachers.size, '명');
    console.log('전체 활동(클릭) 수:', totalActivities, '회');
    console.log('전체 체류 시간:', formatTime(totalStaySeconds));
    
    console.log('\n--- Top 5 Pages ---');
    Object.entries(pageStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([page, count], idx) => {
            console.log(idx + 1 + '. ' + page + ': ' + count + '회');
        });
}
run();
