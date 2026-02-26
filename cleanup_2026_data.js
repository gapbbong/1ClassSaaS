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

async function cleanup2026Data() {
    console.log("🚀 2026학년도 데이터 정제 시작 (자퇴생/졸업생 처리)...");

    try {
        // 1. 2025학년도 3학년 학생들을 졸업생으로 확정 처리 (아카이브)
        // 2026학년도 데이터 중 student_id가 3으로 시작하는 학생들은 기존 3학년(졸업생)일 확률이 높음 (진급 시 4학년이 없으므로)
        const { data: graduates, error: gradError } = await supabase
            .from('students')
            .select('pid, name, student_id')
            .eq('academic_year', 2026)
            .ilike('student_id', '3%');

        if (gradError) throw gradError;

        if (graduates.length > 0) {
            console.log(`🎓 발견된 졸업생(처리 누락): ${graduates.length}명`);
            for (const s of graduates) {
                const { error } = await supabase
                    .from('students')
                    .update({
                        academic_year: 2025,
                        status: 'graduated'
                    })
                    .eq('pid', s.pid);
                if (error) console.error(`❌ ${s.name} 졸업 처리 실패:`, error.message);
                else console.log(`✅ ${s.name} 졸업 아카이브 완료.`);
            }
        } else {
            console.log("✅ 2026학년도에 잘못 남아있는 졸업생이 없습니다.");
        }

        // 2. 2025년도 자퇴생(또는 비활동 학생)이 2026년도로 넘어갔는지 확인
        // status가 'active'가 아닌데 2026학년도로 배정된 학생들을 2025년으로 되돌리고 삭제(또는 아카이브)
        const { data: nonActive, error: nonActiveError } = await supabase
            .from('students')
            .select('pid, name, student_id, status')
            .eq('academic_year', 2026)
            .neq('status', 'active');

        if (nonActiveError) throw nonActiveError;

        if (nonActive.length > 0) {
            console.log(`🚫 발견된 자퇴/비활동 학생: ${nonActive.length}명`);
            for (const s of nonActive) {
                const { error } = await supabase
                    .from('students')
                    .update({
                        academic_year: 2025
                    })
                    .eq('pid', s.pid);
                if (error) console.error(`❌ ${s.name} 자퇴생 처리 실패:`, error.message);
                else console.log(`✅ ${s.name}(${s.status}) 2026 명단에서 제외 완료.`);
            }
        } else {
            console.log("✅ 2026학년도에 넘어온 자퇴생이 없습니다.");
        }

        console.log("\n✨ 데이터 정제가 완료되었습니다.");

    } catch (e) {
        console.error("❌ 정제 중 오류 발생:", e.message);
    }
}

cleanup2026Data();
