import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findDuplicateStudents() {
    console.log("🔍 중복 학생 (2025 & 2026) 및 PID 대조...");

    const targetNames = ["최현수", "김범서", "고현호", "임현묵"]; // 샘플

    for (const name of targetNames) {
        console.log(`\n👤 [${name}] 검색 결과:`);
        const { data: students } = await supabase
            .from('students')
            .select('*')
            .eq('name', name)
            .order('academic_year', { ascending: true });

        students.forEach(s => {
            console.log(`- ${s.academic_year}년도: PID ${s.pid} | 학번 ${s.student_id} | 반 ${s.class_info}`);
        });
    }

    // 16건의 기록이 현재 연결된 진짜 PID 목록 확인
    console.log("\n🧪 현재 생활기록 16건의 student_pid 목록:");
    const { data: records } = await supabase
        .from('life_records')
        .select('id, student_pid, category, content')
        .gte('created_at', '2025-12-01')
        .lte('created_at', '2026-02-01');

    console.log(`기록 건수: ${records.length}`);
    records.slice(0, 5).forEach(r => {
        console.log(`- 기록 ${r.id}: PID ${r.student_pid} | 내용: ${r.content.substring(0, 20)}...`);
    });
}

findDuplicateStudents();
