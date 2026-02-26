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

async function fixFreshmanCount() {
    console.log("🚀 2026학년도 1학년 인원 정정 시작 (133명 맞춤)...");

    try {
        // 1. 실수로 추가했던 1-6반 23번(해과안) 삭제
        const { error: deleteError } = await supabase
            .from('students')
            .delete()
            .eq('student_id', '1623')
            .eq('academic_year', 2026);

        if (deleteError) throw deleteError;
        console.log("✅ 1-6반 23번(보정치) 삭제 완료.");

        // 2. 현재 상태 확인 및 리포트
        const { data, error: fetchError } = await supabase
            .from('students')
            .select('student_id, name')
            .eq('academic_year', 2026)
            .ilike('student_id', '1%')
            .order('student_id');

        if (fetchError) throw fetchError;

        const classStats = data.reduce((acc, s) => {
            const c = s.student_id.substring(1, 2);
            acc[c] = (acc[c] || 0) + 1;
            return acc;
        }, {});

        console.log("\n📊 [현재 반별 인원 현황]");
        Object.keys(classStats).sort().forEach(c => {
            console.log(`- 1-${c}반: ${classStats[c]}명`);
        });
        console.log(`- 총계: ${data.length}명`);

        if (data.length === 133) {
            console.log("\n✨ 데이터가 정정되었습니다. (1-4반만 23명, 나머지 22명)");
        } else {
            console.warn(`\n⚠️ 아직 ${data.length}명입니다. 추가 확인이 필요합니다.`);
        }

    } catch (e) {
        console.error("❌ 정정 중 오류 발생:", e.message);
    }
}

fixFreshmanCount();
