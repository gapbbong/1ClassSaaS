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

async function emergencyRollback() {
    console.log("🚑 [긴급] 2026학년도 3학년 학생 데이터 복구 시작...");

    try {
        // 1. 2026년에 활동해야 할 학생들(2025년에 2학년이었던 학생들) 식별
        const { data: historyData, error: historyError } = await supabase
            .from('student_history')
            .select('student_pid')
            .eq('academic_year', 2025)
            .eq('grade', 2);

        if (historyError) throw historyError;

        const activeStudentPids = historyData.map(h => h.student_pid);
        console.log(`🔍 복구 대상(2025년 2학년이었던 학생): ${activeStudentPids.length}명`);

        if (activeStudentPids.length === 0) {
            console.log("❌ 복구할 대상을 찾지 못했습니다. (history 데이터 확인 필요)");
            return;
        }

        // 2. 해당 학생들의 상태를 active 및 2026학년도로 원복
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

        // 3. 실제 졸업생(작년 3학년)만 status: graduated로 유지되는지 최종 확인
        const { count: gradCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'graduated');

        const { count: active3Count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('academic_year', 2026)
            .eq('status', 'active')
            .ilike('student_id', '3%');

        console.log(`\n📊 [복구 결과 리포트]`);
        console.log(`- 졸업생(graduated): ${gradCount}명`);
        console.log(`- 2026학년도 3학년(active): ${active3Count}명`);

    } catch (e) {
        console.error("❌ 복구 중 오류 발생:", e.message);
    }
}

emergencyRollback();
