import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTestSubmission() {
    console.log('--- 3402 학생 테스트 설문 제출 확인 ---');

    // 1. 학생 찾기 (2026학년도 3402)
    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('pid, name, student_id, academic_year')
        .eq('student_id', '3402')
        .eq('academic_year', 2026)
        .single();

    if (studentError || !student) {
        console.error('학생 조회 실패:', studentError?.message || '학생을 찾을 수 없습니다.');
        return;
    }

    console.log(`학생 확인: ${student.name} (${student.student_id}, PID: ${student.pid})`);

    // 2. 설문 데이터 조회
    const { data: surveys, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('student_pid', student.pid)
        .order('submitted_at', { ascending: false });

    if (surveyError) {
        console.error('설문 조회 실패:', surveyError.message);
        return;
    }

    if (!surveys || surveys.length === 0) {
        console.log('❌ 아직 제출된 설문이 없습니다.');
    } else {
        console.log(`✅ ${surveys.length}건의 설문이 확인되었습니다.`);
        surveys.forEach((s, idx) => {
            console.log(`\n[제출 #${idx + 1}]`);
            console.log(`제출 일시: ${s.submitted_at}`);
            console.log('데이터 요약:', JSON.stringify(s.data).substring(0, 100) + '...');
        });
    }
}

checkTestSubmission();
