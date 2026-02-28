import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
    console.log("🚀 생활기록 2026학년도 재연결 마이그레이션 시작...");

    // 1. 2025학년도 학생에게 연결된 기록 가져오기
    const { data: records, error: rError } = await supabase
        .from('life_records')
        .select(`
            id,
            students!inner (
                student_id,
                name,
                academic_year
            )
        `)
        .eq('students.academic_year', 2025);

    if (rError) {
        console.error("❌ 기록 조회 에러:", rError);
        return;
    }

    if (!records || records.length === 0) {
        console.log("✅ 재연결할 2025학년도 기록이 없습니다.");
        return;
    }

    console.log(`📊 대상 기록: ${records.length}건`);

    let updatedCount = 0;
    let failCount = 0;

    for (const r of records) {
        const studentId = r.students.student_id;

        // 2026학년도 학생 PID 찾기
        const { data: s2026, error: sError } = await supabase
            .from('students')
            .select('pid')
            .eq('student_id', studentId)
            .eq('academic_year', 2026)
            .single();

        if (sError || !s2026) {
            console.warn(`⚠️ 학번 ${studentId}: 2026학년도 데이터를 찾을 수 없어 스킵합니다.`);
            failCount++;
            continue;
        }

        // 2. 기록의 student_pid 업데이트
        const { error: uError } = await supabase
            .from('life_records')
            .update({ student_pid: s2026.pid })
            .eq('id', r.id);

        if (uError) {
            console.error(`❌ 기록 ID ${r.id} (${studentId}) 업데이트 실패:`, uError);
            failCount++;
        } else {
            console.log(`✅ 기록 ID ${r.id} (${studentId}): 2026학년도로 재연결 완료`);
            updatedCount++;
        }
    }

    console.log(`\n🎉 마이그레이션 완료!`);
    console.log(`   성공: ${updatedCount}건`);
    console.log(`   실패/스킵: ${failCount}건`);
}

migrate();
