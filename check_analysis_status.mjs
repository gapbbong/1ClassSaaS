import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkStatus() {
    try {
        const { data: stds, error: stdError } = await supabase.from('students').select('pid, name, academic_year').in('academic_year', ['2025', '2026']);
        if (stdError) throw stdError;

        const { data: survs, error: survError } = await supabase.from('surveys').select('student_pid');
        if (survError) throw survError;

        const { data: exi, error: exiError } = await supabase.from('student_insights').select('student_pid').eq('insight_type', 'omni');
        if (exiError) throw exiError;

        const surveyPids = new Set(survs.map(u => u.student_pid));
        const insightPids = new Set(exi.map(i => i.student_pid));

        const targets = stds.filter(s => surveyPids.has(s.pid));
        const analyzed = targets.filter(s => insightPids.has(s.pid));
        const pending = targets.filter(s => !insightPids.has(s.pid));

        console.log(`\n📊 [분석 현황 보고]`);
        console.log(`- 전체 학생 (2025/2026): ${stds.length}명`);
        console.log(`- 설문 데이터가 있는 학생: ${targets.length}명`);
        console.log(`- ✅ 분석 완료 (insight_type='omni'): ${analyzed.length}명`);
        console.log(`- ⏳ 분석 대기: ${pending.length}명`);

        if (pending.length > 0) {
            console.log(`\n목록 (대기 ${pending.length}명):`);
            console.log(pending.map(s => `${s.name}(${s.pid})`).join(', '));
        } else {
            console.log(`\n🎉 모든 대상의 분석이 완료되었습니다!`);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

checkStatus();
