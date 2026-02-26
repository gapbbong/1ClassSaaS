import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function purgeGhostGrads() {
    console.log("🧹 [정화] 졸업생 명단에서 유령 데이터 삭제 시작...");

    // 1. 진짜 2025년毕业생 PID 리스트 로드
    const poolGrads = JSON.parse(fs.readFileSync('pool_2025_grads.json', 'utf8'));
    const realGradPids = new Set(poolGrads.map(h => h.student_pid));

    // 2. 현재 DB의 2025학년도 졸업생 전체 조회
    const { data: currentGrads } = await supabase
        .from('students')
        .select('pid, name, student_id, class_info')
        .eq('status', 'graduated')
        .eq('academic_year', 2025)
        .ilike('class_info', '3-%');

    if (!currentGrads) return;

    const ghostPids = currentGrads
        .filter(s => !realGradPids.has(s.pid))
        .map(s => s.pid);

    console.log(`- 진짜 졸업생(PID 일치): ${realGradPids.size}명`);
    console.log(`- 유령 데이터(삭제 대상): ${ghostPids.length}명`);

    if (ghostPids.length > 0) {
        // 유령 데이터 삭제 (또는 아주 과거 연도로 격리)
        // 일단 삭제하여 명단을 깨끗하게 만듭니다.
        const { error } = await supabase
            .from('students')
            .delete()
            .in('pid', ghostPids);

        if (error) {
            console.error("❌ 유령 데이터 삭제 실패:", error.message);
        } else {
            console.log("✅ 유령 데이터 삭제 완료. 이제 학번당 이름은 하나만 남습니다.");
        }
    }

    // 3. 결과 다시 확인 (3-1반)
    console.log("\n✨ [정화 완료] 2025학년도 3-1반 최종 명단:");
    const { data: finalSample } = await supabase
        .from('students')
        .select('student_id, name')
        .eq('status', 'graduated')
        .eq('academic_year', 2025)
        .eq('class_info', '3-1')
        .order('student_id');

    console.log(finalSample?.map(s => `${s.student_id} ${s.name}`).join(', ') || "없음");
}

purgeGhostGrads();
