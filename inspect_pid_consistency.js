import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectPids() {
    console.log("🔍 PID 일관성 및 중복 조사...");

    // 1. 2025년 학생 정보 로드
    const { data: s2025 } = await supabase
        .from('students')
        .select('pid, name, student_id')
        .eq('academic_year', 2025);

    // 2. 2026년 학생 정보 로드
    const { data: s2026 } = await supabase
        .from('students')
        .select('pid, name, student_id')
        .eq('academic_year', 2026);

    const pid2025 = new Set(s2025.map(s => s.pid));
    const pid2026 = new Set(s2026.map(s => s.pid));

    // 교집합: 2025년과 2026년 모두 존재하는 PID (정상 진입/진급)
    const intersect = s2025.filter(s => pid2026.has(s.pid));

    console.log(`📊 2025년 학생 수: ${s2025.length}`);
    console.log(`📊 2026년 학생 수: ${s2026.length}`);
    console.log(`📊 PID 유지 학생 수: ${intersect.length}`);

    // 만약 PID 유지 학생이 적다면, 이름 기반으로 PID가 바뀐 학생들 샘플링
    if (intersect.length < s2025.length * 0.5) {
        console.log("\n⚠️ PID가 대부분 변경되었습니다. 이름이 같지만 PID가 다른 사례:");
        s2025.slice(0, 10).forEach(s => {
            const match2026 = s2026.find(m => m.name === s.name);
            if (match2026 && match2026.pid !== s.pid) {
                console.log(`- ${s.name}: 2025(${s.pid}) -> 2026(${match2026.pid}) [학번: ${s.student_id} -> ${match2026.student_id}]`);
            }
        });
    }
}

inspectPids();
