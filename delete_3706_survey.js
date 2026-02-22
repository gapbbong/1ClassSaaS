import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteSurveys() {
    console.log("3706 학생 조회 중...");
    const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('pid, name')
        .eq('student_id', '3706')
        .single();

    if (fetchError || !student) {
        console.error("학생을 찾을 수 없습니다:", fetchError);
        return;
    }

    console.log(`학생 확인됨: ${student.name} (PID: ${student.pid})`);

    // 해당 학생의 설문 데이터 삭제
    const { error: deleteError } = await supabase
        .from('surveys')
        .delete()
        .eq('student_pid', student.pid);

    if (deleteError) {
        console.error("삭제 실패:", deleteError);
    } else {
        console.log("✅ 3706 학생의 설문 제출 내역이 성공적으로 삭제되었습니다!");
    }
}

deleteSurveys();
