import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY가 필요합니다. .env 파일을 확인해주세요.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CURRENT_YEAR = 2025;

async function processGraduation() {
    console.log(`🚀 ${CURRENT_YEAR}학년도 졸업 처리 및 아카이브 시작...`);

    try {
        // 1. 교사 정보 아카이브 (teacher_history)
        console.log("1️⃣ 교사 명단 아카이브 중...");
        const { data: teachers, error: tFetchError } = await supabase
            .from('teachers')
            .select('*');

        if (tFetchError) throw tFetchError;

        const teacherHistory = teachers.map(t => ({
            academic_year: CURRENT_YEAR,
            email: t.email,
            name: t.name,
            role: t.role,
            assigned_class: t.assigned_class
        }));

        const { error: tInsertError } = await supabase
            .from('teacher_history')
            .insert(teacherHistory);

        // 만약 테이블이 없으면 에러가 날 것이므로, 여기서는 우선 진행하고 에러 시 안내
        if (tInsertError && tInsertError.code === '42P01') {
            console.error("❌ 'teacher_history' 테이블이 없습니다. DB 스키마 생성이 필요합니다.");
            return;
        } else if (tInsertError) throw tInsertError;
        console.log(`✅ 교사 ${teachers.length}명 아카이브 완료.`);

        // 2. 학생 학급 이력 저장 (student_history)
        console.log("2️⃣ 학생 학급 이력 저장 중...");
        const { data: students, error: sFetchError } = await supabase
            .from('students')
            .select('pid, class_info')
            .eq('academic_year', CURRENT_YEAR)
            .eq('status', 'active');

        if (sFetchError) throw sFetchError;

        const studentHistory = students.map(s => ({
            student_pid: s.pid,
            academic_year: CURRENT_YEAR,
            class_info: s.class_info
        }));

        const { error: sInsertError } = await supabase
            .from('student_history')
            .insert(studentHistory);

        if (sInsertError) throw sInsertError;
        console.log(`✅ 학생 ${students.length}명 학급 이력 저장 완료.`);

        // 3. 3학년 학생 졸업 상태 변경
        console.log("3️⃣ 3학년 졸업 처리 중...");
        const { error: gradError } = await supabase
            .from('students')
            .update({ status: 'graduated' })
            .eq('academic_year', CURRENT_YEAR)
            .like('class_info', '3-%');

        if (gradError) throw gradError;
        console.log(`✅ 3학년 학생 졸업 처리 완료.`);

        console.log("\n✨ [STEP 1] 졸업 처리 및 데이터 아카이브가 성공적으로 완료되었습니다.");

    } catch (error) {
        console.error("💥 작업 중 치명적 오류 발생:", error);
    }
}

processGraduation();
