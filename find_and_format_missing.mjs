import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import util from 'util';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findMissingInsights() {
    const { data: students } = await supabase.from('students').select('pid, name, student_id').eq('class_info', '1-4');
    const pids = students.map(s => s.pid);
    const { data: insights } = await supabase.from('student_insights').select('student_pid, content, analyzed_at').in('student_pid', pids).order('analyzed_at', { ascending: false });

    // Filter missing
    const missingStudents = [];
    const validStudents = [];

    students.forEach(student => {
        const latestInsight = insights.find(i => i.student_pid === student.pid);

        if (!latestInsight) {
            missingStudents.push({ ...student, reason: '분석 데이터 없음 (미분석)' });
            return;
        }

        const content = latestInsight.content;
        const hasStats = content.stats && typeof content.stats === 'object' && Object.keys(content.stats).length > 0;
        const hasHolistic = content.holistic_analysis && typeof content.holistic_analysis === 'object' && Object.keys(content.holistic_analysis).length > 0;

        if (!hasStats || !hasHolistic) {
            missingStudents.push({ ...student, reason: '구버전 분석 (다면평가/전인적 프로파일 누락)' });
        } else {
            validStudents.push(student);
        }
    });

    console.log(`\n총 학생 수: ${students.length}`);
    console.log(`완전한 최신 분석 데이터가 있는 학생: ${validStudents.length}명`);
    console.log(`다면평가/전인적 분석 누락(구버전 또는 미분석) 학생: ${missingStudents.length}명`);
    console.log("=================================");

    // Sort by student_id
    missingStudents.sort((a, b) => a.student_id - b.student_id);
    missingStudents.forEach(s => {
        console.log(`- ${s.student_id} ${s.name} : ${s.reason}`);
    });
}
findMissingInsights();
