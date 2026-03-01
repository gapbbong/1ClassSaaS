import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addMockOut() {
    console.log("활성 상태인 학생을 찾는 중...");

    // 조퇴 테스트를 했던 강민성(2401) 다음 학생 픽
    const { data: students, error: fetchError } = await supabase
        .from('students')
        .select('pid, name, student_id')
        .eq('status', 'active')
        .neq('student_id', '2401')
        .limit(1);

    if (fetchError || !students || students.length === 0) {
        console.error("학생을 찾을 수 없거나 에러 발생:", fetchError);
        return;
    }

    const student = students[0];
    console.log(`선택된 외출 테스트 학생: ${student.name} (${student.student_id})`);

    console.log("외출 기록을 삽입합니다...");
    const { error: insertError } = await supabase
        .from('life_records')
        .insert([{
            student_pid: student.pid,
            category: '근태',
            content: '병원 진료로 인한 외출 (15:00 복귀)',
            teacher_email_prefix: 'test_teacher',
            is_positive: false
        }]);

    if (insertError) {
        console.error("기록 삽입 실패:", insertError);
    } else {
        console.log(`✅ [${student.name}] 학생의 외출 시험용 기록이 성공적으로 등록되었습니다!`);
    }
}

addMockOut();
