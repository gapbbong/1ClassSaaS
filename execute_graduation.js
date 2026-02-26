import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteToGraduate() {
    try {
        console.log("=== 2025학년도 3학년 졸업 처리 시작 ===");
        const CURRENT_YEAR = 2025;

        // 1. 2025 교사 이력 저장 (teacher_history)
        console.log("1️⃣ 교사 이력(담임/부담임) 백업 중...");
        const { data: teachers, error: tFetchError } = await supabase
            .from('teachers')
            .select('*');

        if (tFetchError) throw tFetchError;

        const teacherHistory = teachers.map(t => ({
            teacher_id: t.teacher_id,
            academic_year: CURRENT_YEAR,
            department: t.department,
            role: t.role,
            is_homeroom: t.is_homeroom,
            homeroom_grade: t.homeroom_grade,
            homeroom_class: t.homeroom_class,
            is_sub_homeroom: t.is_sub_homeroom,
            sub_homeroom_grade: t.sub_homeroom_grade,
            sub_homeroom_class: t.sub_homeroom_class
        }));

        // 중복 방지를 위한 upsert 등 활용 (가벼운 작업이므로 단순 insert 무시 on conflict)
        const { error: tInsertError } = await supabase
            .from('teacher_history')
            .upsert(teacherHistory, { onConflict: 'teacher_id, academic_year' });

        if (tInsertError) {
            console.error("교사 백업 에러: ", tInsertError.message);
        } else {
            console.log(`✅ 교사 ${teachers.length}명 아카이브(upsert) 완료.`);
        }

        // 2. 학생 학급 이력 저장 (student_history) (전학년 대상)
        console.log("2️⃣ 전체 학생 학급 이력 백업 중...");
        const { data: students, error: sFetchError } = await supabase
            .from('students')
            .select('pid, class_info')
            .eq('academic_year', CURRENT_YEAR);

        if (sFetchError) throw sFetchError;

        const studentHistoryList = students.map(s => ({
            student_pid: s.pid,
            academic_year: CURRENT_YEAR,
            class_info: s.class_info
        }));

        // 충돌 시 무시 (동일 연도 이력 보존 목적)
        const { error: sInsertError } = await supabase
            .from('student_history')
            .upsert(studentHistoryList, { onConflict: 'student_pid, academic_year' });

        if (sInsertError) {
            console.error("학생 백업 에러: ", sInsertError.message);
        } else {
            console.log(`✅ 학생 ${students.length}명 학급 이력(upsert) 완료.`);
        }

        // 3. 3학년 대상만 졸업(graduated) 처리
        console.log("3️⃣ 3학년 학생 'graduated' 졸업 상태 업데이트 중...");
        const { data: gradData, error: gradError } = await supabase
            .from('students')
            .update({ status: 'graduated' })
            .eq('academic_year', CURRENT_YEAR)
            .like('class_info', '3-%')
            .select('student_id, name');

        if (gradError) throw gradError;
        console.log(`✅ 3학년 학생 총 ${gradData.length}명 'graduated' 졸업 처리 완료.`);

        console.log("\n✨ [STEP 1] 졸업 대상 이력 관리 및 변경이 성공적으로 적용되었습니다!");

    } catch (error) {
        console.error("💥 오류 발생:", error);
    }
}

promoteToGraduate();
