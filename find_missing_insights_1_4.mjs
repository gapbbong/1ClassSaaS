import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findMissingInsights() {
    try {
        console.log("1-4반 학생 목록 조회 중...");
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('pid, name, student_id')
            .eq('class_info', '1-4')
            .order('student_id', { ascending: true });

        if (studentError) throw studentError;

        console.log(`1-4반 총 학생 수: ${students.length}명`);

        const pids = students.map(s => s.pid);

        // 학생별 인사이트 조회 (가장 최신 데이터만 가져오기 위해 orderBy 후 루프나 통째로 가져와서 필터)
        const { data: insights, error: insightError } = await supabase
            .from('student_insights')
            .select('student_pid, content, analyzed_at')
            .in('student_pid', pids)
            .order('analyzed_at', { ascending: false });

        if (insightError) throw insightError;

        const missingStudents = [];

        students.forEach(student => {
            // 가장 최신 인사이트 데이터 1건
            const latestInsight = insights.find(i => i.student_pid === student.pid);

            if (!latestInsight) {
                missingStudents.push({ ...student, reason: '분석 데이터 자체가 없음' });
                return;
            }

            const content = latestInsight.content;
            if (!content || typeof content !== 'object') {
                missingStudents.push({ ...student, reason: '분석 데이터 형식이 올바르지 않음' });
                return;
            }

            const hasStats = content.stats && typeof content.stats === 'object' && Object.keys(content.stats).length > 0;
            const hasHolistic = content.holistic_analysis && typeof content.holistic_analysis === 'object' && Object.keys(content.holistic_analysis).length > 0;

            if (!hasStats || !hasHolistic) {
                const missingParts = [];
                if (!hasStats) missingParts.push('stats(다면평가 수치)');
                if (!hasHolistic) missingParts.push('holistic_analysis(전인적 분석)');

                missingStudents.push({ ...student, reason: missingParts.join(', ') + ' 누락' });
            }
        });

        console.log("\n=================================");
        console.log(`🚨 다면평가/전인적 분석 누락 학생: ${missingStudents.length}명`);
        console.log("=================================");
        missingStudents.forEach(s => {
            console.log(`- ${s.student_id} ${s.name} : ${s.reason}`);
        });

    } catch (e) {
        console.error("오류 발생:", e);
    }
}

findMissingInsights();
