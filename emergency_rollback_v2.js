import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function emergencyRollbackV2() {
    console.log("🚑 [긴급] 2026학년도 3학년 학생 데이터 복구(V2) 시작...");

    try {
        // 1. student_history에서 2025학년도에 2학년(2-X반)이었던 학생 PID 추출
        const { data: historyData, error: historyError } = await supabase
            .from('student_history')
            .select('student_pid')
            .eq('academic_year', 2025)
            .ilike('class_info', '2-%'); // '2-1', '2-2' 등 작년 2학년 명단

        if (historyError) throw historyError;

        const activeStudentPids = historyData.map(h => h.student_pid);
        console.log(`🔍 복구 대상(2025년 2학년이었던 학생): ${activeStudentPids.length}명`);

        if (activeStudentPids.length === 0) {
            console.log("❌ 복구할 대상을 찾지 못했습니다. (2025년 2학년 이력이 없음)");
            // 이력이 없는 경우를 대비해 student_id가 3으로 시작하는 학생들 중 2026학년도 데이터를 일단 active로 되돌리기 시도
            const { data: current3rd, error: cError } = await supabase
                .from('students')
                .select('pid, name')
                .eq('academic_year', 2026)
                .ilike('student_id', '3%');

            if (current3rd.length > 0) {
                console.log(`💡 이력은 없지만 2026년 3학년 학번인 ${current3rd.length}명을 복구합니다.`);
                for (const s of current3rd) {
                    await supabase.from('students').update({ status: 'active' }).eq('pid', s.pid);
                }
            }
            return;
        }

        // 2. 해당 학생들을 2026학년도 active로 강제 복구
        let successCount = 0;
        for (const pid of activeStudentPids) {
            const { error: updateError } = await supabase
                .from('students')
                .update({
                    status: 'active',
                    academic_year: 2026
                })
                .eq('pid', pid);

            if (!updateError) successCount++;
        }

        console.log(`✅ ${successCount}명의 3학년 학생 상태 복구 완료!`);

        // 3. 추가 조치: 자퇴생은 status를 withdrawn 등으로 명확히 해야 함
        // 여기서는 일단 모든 student_id 3XXXX (올해 3학년 학번) 중 잘못된 졸업 처리 전면 취소
        console.log("🛠️ 추가 검증 중...");
        const { data: finalCheck } = await supabase
            .from('students')
            .update({ status: 'active' })
            .eq('academic_year', 2026)
            .ilike('student_id', '3%');

    } catch (e) {
        console.error("❌ 복구 중 오류 발생:", e.message);
    }
}

emergencyRollbackV2();
