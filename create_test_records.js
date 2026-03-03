import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestRecords() {
    console.log("🚀 2학년 2반 강대현(2202) 학생 테스트 데이터 생성 시작...");

    // 0. 이전 잘못된 데이터(2501) 삭제
    await supabase.from('life_records').delete().eq('teacher_email_prefix', 'test');

    // 1. 학생 정보 조회
    const { data: student, error: sError } = await supabase
        .from('students')
        .select('pid, name')
        .eq('student_id', '2202')
        .eq('academic_year', 2026)
        .single();


    if (sError || !student) {
        console.error("❌ 학생 조회 실패:", sError?.message || "학생을 찾을 수 없습니다.");
        return;
    }

    console.log(`✅ 대상 학생 확인: ${student.name} (pid: ${student.pid})`);

    // 오늘 날짜 (KST 기준)
    const now = new Date();
    const today = now.toISOString();

    const records = [
        {
            student_pid: student.pid,
            category: '근태',
            content: '오전 지각 (테스트)',
            is_positive: false,
            teacher_email_prefix: 'test',
            created_at: today
        },
        {
            student_pid: student.pid,
            category: '근태',
            content: '오후 조퇴(14:30~)',
            is_positive: false,
            teacher_email_prefix: 'test',
            created_at: today
        }
    ];

    console.log("📝 기록 삽입 중...");
    const { error } = await supabase.from('life_records').insert(records);

    if (error) {
        console.error("❌ 기록 삽입 실패:", error.message);
    } else {
        console.log("✨ 테스트 데이터 생성 완료! 로컬 서버에서 확인해 보세요.");
    }
}

createTestRecords();
