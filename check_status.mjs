import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    process.stdout.write('\x1Bc'); // Clear console
    console.log("==================================================");
    console.log("   👀 백그라운드 AI 분석 엔진 실시간 모니터링 👀");
    console.log("==================================================\n");

    try {
        const { count: totalStudents } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('academic_year', '2026');
        const { count: totalSurveys } = await supabase.from('surveys').select('*', { count: 'exact', head: true });
        const { count: totalAnalyzed } = await supabase.from('student_insights').select('*', { count: 'exact', head: true });

        // 이 로직은 백그라운드 스크립트의 타겟 추출 로직과 동일하게 남은 수를 계산합니다. 
        // 전체 제출자 중에서 분석이 완료된 학생 수를 빼면 러프하게 남은 수가 나옵니다.
        // 완벽하게 일치하려면 PID 교집합을 구해야 하지만, 모니터링용으로는 count 만으로도 진행 상황 파악에 충분합니다.

        console.log(`✅ 기초조사 제출 완료 학생 수: ${totalSurveys}명`);
        console.log(`🤖 AI 분석 완료 학생 수: ${totalAnalyzed}명`);
        console.log(`⏳ 남은 분석 학생 수 (대략): ${totalSurveys - totalAnalyzed}명\n`);

        console.log(`진행률: ${Math.round((totalAnalyzed / totalSurveys) * 100)}% 완료됨`);

        // Progress bar
        const barLength = 40;
        const filledLength = Math.round(barLength * (totalAnalyzed / totalSurveys));
        const emptyLength = barLength - filledLength;
        const filledStr = '█'.repeat(filledLength);
        const emptyStr = '░'.repeat(emptyLength);
        console.log(`[${filledStr}${emptyStr}]`);

        console.log("\n==================================================");
        console.log("새로고침을 원하시면 Enter를, 종료하시려면 Ctrl+C를 누르세요.");

    } catch (e) {
        console.error("데이터 통계 조회 중 오류 발생:", e.message);
    }
}

// 실시간 자동 갱신 및 터미널 엔터 대기
async function monitor() {
    await checkStatus();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', async () => {
        await checkStatus();
    });
}

monitor();
