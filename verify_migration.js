import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
    console.log("🔍 마이그레이션 결과 검증...");

    // 2026학년도로 연결된 기록 수 확인
    const { data: records, error } = await supabase
        .from('life_records')
        .select(`
            id,
            students!inner (
                academic_year,
                class_info,
                name
            )
        `)
        .eq('students.academic_year', 2026);

    if (error) {
        console.error("❌ 에러:", error);
        return;
    }

    console.log(`✅ 2026학년도로 조회되는 기록 건수: ${records.length}건`);

    // 반별 집계 확인 (대시보드 배지용)
    const stats = {};
    records.forEach(r => {
        const key = r.students.class_info;
        stats[key] = (stats[key] || 0) + 1;
    });
    console.log("📊 반별 기록 집계:", stats);
}

verify();
