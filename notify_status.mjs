import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus(isAutomatic = false) {
    try {
        const { count: totalStudents } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('academic_year', '2026');
        const { count: totalSurveys } = await supabase.from('surveys').select('*', { count: 'exact', head: true });
        const { count: totalAnalyzed } = await supabase.from('student_insights').select('*', { count: 'exact', head: true });

        const currentTime = new Date().toLocaleTimeString('ko-KR', { hour12: false });

        console.log(`\n==================================================`);
        console.log(`   ⏰ [${currentTime}] AI 분석 진행률 자동 알림 ⏰`);
        console.log(`==================================================`);

        console.log(`✅ 기초조사 제출: ${totalSurveys}명`);
        console.log(`🤖 AI 분석 완료: ${totalAnalyzed}명`);
        console.log(`⏳ 남은 분석 인원: ${totalSurveys - totalAnalyzed}명`);

        const progress = Math.round((totalAnalyzed / totalSurveys) * 100);
        console.log(`📊 진행률: ${progress}% 완료됨`);

        // Progress bar
        const barLength = 40;
        const filledLength = Math.round(barLength * (totalAnalyzed / totalSurveys));
        const emptyLength = barLength - filledLength;
        const filledStr = '█'.repeat(filledLength);
        const emptyStr = '░'.repeat(emptyLength);
        console.log(`[${filledStr}${emptyStr}]`);
        console.log(`==================================================\n`);

        if (totalSurveys === totalAnalyzed) {
            console.log("🎉 모든 분석이 완료되었습니다. 자동 알림을 종료합니다.");
            process.exit(0);
        }

    } catch (e) {
        console.error(`[${new Date().toLocaleTimeString('ko-KR')}] 오류 발생:`, e.message);
    }
}

// 처음 1번 즉시 실행
checkStatus(true);

// 20분 단위(1200000ms) 실행 인터벌 설정
const INTERVAL_MS = 20 * 60 * 1000;
setInterval(() => {
    checkStatus(true);
}, INTERVAL_MS);

console.log("⏳ 20분 주기로 분석 진행률 알림이 터미널에 출력됩니다. (종료 시 Ctrl+C)");
