import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addMockEarlyLeave() {
    console.log("활성 상태인 학생을 찾는 중...");

    // 25학년도 아무 활성 학생 하나 선택 (예: 2학년)
    const { data: students, error: fetchError } = await supabase
        .from('students')
        .select('pid, name, student_id')
        .eq('status', 'active')
        .limit(1);

    if (fetchError || !students || students.length === 0) {
        console.error("학생을 찾을 수 없거나 에러 발생:", fetchError);
        return;
    }

    const student = students[0];
    console.log(`선택된 학생: ${student.name} (${student.student_id})`);

    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const detailMsg = `오후 조퇴(13:00~) 테스트`;

    console.log("조퇴 기록을 삽입합니다...");
    const { error: insertError } = await supabase
        .from('life_records')
        .insert([{
            student_pid: student.pid,
            category: '근태',
            content: detailMsg,
            teacher_email_prefix: 'test_teacher',
            is_positive: false
        }]);

    if (insertError) {
        console.error("기록 삽입 실패:", insertError);
    } else {
        console.log(`✅ [${student.name}] 학생의 조퇴 시험용 기록이 성공적으로 등록되었습니다!`);
        console.log("👉 지킴이 선생님 화면(keeper.html)을 켜서 확인해 보세요!");
    }
}

addMockEarlyLeave();
