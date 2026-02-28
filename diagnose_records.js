import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
    console.log("🔍 생활기록 상세 진단 시작...");

    const { data: records, error } = await supabase
        .from('life_records')
        .select(`
            id,
            created_at,
            category,
            content,
            students (
                student_id,
                name,
                academic_year,
                class_info
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("❌ 에러:", error);
        return;
    }

    console.log(`📊 조회된 기록: ${records.length}건`);
    records.forEach((r, i) => {
        const s = r.students;
        console.log(`[${i + 1}] ${r.created_at} | ${s?.academic_year}년 | ${s?.student_id} ${s?.name} | ${r.category}: ${r.content.substring(0, 20)}...`);
    });

    // 2026년 동일 학번 학생 존재 여부 체크
    console.log("\n🧪 2026학년도 매핑 테스트...");
    for (const r of records) {
        if (r.students && r.students.student_id) {
            const { data: s2026 } = await supabase
                .from('students')
                .select('pid, name, class_info')
                .eq('student_id', r.students.student_id)
                .eq('academic_year', 2026)
                .single();

            if (s2026) {
                console.log(`✅ 학번 ${r.students.student_id} (${r.students.name}): 2026학년도 데이터 존재 (${s2026.class_info})`);
            } else {
                console.log(`❌ 학번 ${r.students.student_id} (${r.students.name}): 2026학년도 데이터 없음`);
            }
        }
    }
}

diagnose();
