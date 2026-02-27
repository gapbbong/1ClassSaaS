import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function deleteTestSubmission() {
    console.log('--- 3402 학생 테스트 설문 데이터 삭제 ---');

    // 1. 학생 찾기 (2026학년도 3402)
    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('pid, name')
        .eq('student_id', '3402')
        .eq('academic_year', 2026)
        .single();

    if (studentError || !student) {
        console.error('학생 조회 실패:', studentError?.message);
        return;
    }

    const pid = student.pid;
    console.log(`학생 확인: ${student.name} (PID: ${pid})`);

    // 2. 설문 데이터 삭제
    const { error: deleteError } = await supabase
        .from('surveys')
        .delete()
        .eq('student_pid', pid);

    if (deleteError) {
        console.error('설문 삭제 실패:', deleteError.message);
    } else {
        console.log('✅ 설문 데이터가 삭제되었습니다.');
    }

    // 3. 학생 마스터 테이블 정보 초기화 (연락처, 주소 등 삭제)
    const { error: updateError } = await supabase
        .from('students')
        .update({
            contact: null,
            parent_contact: null,
            address: null,
            instagram_id: null
        })
        .eq('pid', pid);

    if (updateError) {
        console.error('학생 정보 초기화 실패:', updateError.message);
    } else {
        console.log('✅ 학생 마스터 정보(연락처, 주소 등)가 초기화되었습니다. (학번/이름 유지)');
    }
}

deleteTestSubmission();
