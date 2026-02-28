import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function correct() {
    console.log("🛠️ 생활기록 진급 매핑 수정 시작 (이름 기준)...");

    // 1. 현재 2026년 학생들에게 연결된 16건의 기록 조회
    // (이전 16건은 2025-12 ~ 2026-01 사이에 생성된 것들)
    const { data: records, error: rError } = await supabase
        .from('life_records')
        .select(`
            id,
            created_at,
            category,
            content,
            students!inner (
                student_id,
                name,
                academic_year
            )
        `)
        .eq('students.academic_year', 2026)
        .gte('created_at', '2025-12-01')
        .lte('created_at', '2026-02-01');

    if (rError) throw rError;

    console.log(`📊 대상 기록: ${records.length}건`);

    let fixedCount = 0;

    for (const r of records) {
        // 이 기록이 원래 어떤 학생의 것이었는지 2025년 데이터에서 역추적
        // (우리가 이전 스크립트에서 r.students.student_id를 2026년에서 찾았으므로 r.students.student_id는 사실 2025년의 그 학번임)
        const oldId = r.students.student_id;

        // 2025년 학생 정보 (진짜 주인 찾기)
        const { data: s2025 } = await supabase
            .from('students')
            .select('name')
            .eq('student_id', oldId)
            .eq('academic_year', 2025)
            .single();

        if (!s2025) {
            console.warn(`⚠️ 기록ID ${r.id}: 2025년 데이터를 찾을 수 없음 (학번 ${oldId})`);
            continue;
        }

        const realName = s2025.name;

        // 해당 이름을 가진 2026년 학생(승급된 학생) 찾기
        const { data: s2026 } = await supabase
            .from('students')
            .select('pid, student_id, class_info')
            .eq('name', realName)
            .eq('academic_year', 2026)
            .single();

        if (!s2026) {
            console.warn(`⚠️ 기록ID ${r.id}: 2026년 승급 데이터를 찾을 수 없음 (이름 ${realName})`);
            continue;
        }

        if (r.students.student_id === s2026.student_id) {
            console.log(`ℹ️ 기록ID ${r.id}: 이미 올바른 학생(${realName}, ${s2026.student_id})에게 연결되어 있습니다.`);
            continue;
        }

        // 2. 정확한 PID로 업데이트
        const { error: uError } = await supabase
            .from('life_records')
            .update({ student_pid: s2026.pid })
            .eq('id', r.id);

        if (uError) {
            console.error(`❌ 기록ID ${r.id} 업데이트 실패:`, uError);
        } else {
            console.log(`✅ 기록ID ${r.id} 수정 완료: ${oldId}(2025) -> ${s2026.student_id}(2026) 주인:${realName}`);
            fixedCount++;
        }
    }

    console.log(`\n🎉 수정 완료! 총 ${fixedCount}건 재연결됨.`);
}

correct().catch(err => console.error(err));
