import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkFinalStatus() {
    try {
        // 2025학년도 학생 전체 명단
        const { data: students } = await supabase.from('students').select('pid, name').eq('academic_year', '2025');
        // 제출된 설문 전체 명단
        const { data: surveys } = await supabase.from('surveys').select('student_pid');
        // AI 분석이 완료된 항목 전체 명단
        const { data: insights } = await supabase.from('student_insights').select('student_pid');

        if (!students || !surveys || !insights) throw new Error("DB 데이터 로드 실패");

        const submittedPids = new Set(surveys.map(s => s.student_pid));
        const analyzedPids = new Set(insights.map(i => i.student_pid));

        // '설문을 냈는데 아직 분석이 안 된 학생'들을 찾습니다.
        const pendingAnalysis = students.filter(s => submittedPids.has(s.pid) && !analyzedPids.has(s.pid));

        console.log('\n====================================');
        console.log('📊 최종 AI 분석 완료 현황 보고');
        console.log('------------------------------------');
        console.log(`✅ 2025학년도 전체 학생: ${students.length}명`);
        console.log(`✅ 현재 설문 제출한 학생: ${submittedPids.size}명`);
        console.log(`✅ AI 심층 분석 완료된 학생: ${analyzedPids.size}명`);
        console.log('------------------------------------');

        if (pendingAnalysis.length === 0) {
            console.log('🎉 [검증 완료] 제출된 모든 설문에 대해 AI 분석이 100% 완료되었습니다!');
        } else {
            console.log(`⚠️ 아직 분석이 더 필요한 학생: ${pendingAnalysis.length}명`);
            console.log(`미분석 명단: ${pendingAnalysis.map(s => s.name).join(', ')}`);
            console.log('\n💡 팁: 남은 학생들은 node run_batch.mjs를 다시 실행하시면 분석됩니다.');
        }
        console.log('====================================\n');

    } catch (e) {
        console.error("오류 발생:", e.message);
    }
}

checkFinalStatus();
