import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkIssues() {
    console.log("🔍 피드백 이슈 정밀 조사...");

    // 1. 사진 누락 확인
    const studentIds = ["2411", "3301"];
    const { data: students } = await supabase
        .from('students')
        .select('student_id, name, photo_url, academic_year')
        .in('student_id', studentIds)
        .eq('academic_year', 2026);

    console.log("\n🖼️ 사진 누락 의심 학생:");
    students.forEach(s => {
        console.log(`- [${s.student_id}] ${s.name} | URL: ${s.photo_url || '없음'}`);
    });

    // 2. 3615(차지연 vs 조현용) 매핑 확인
    console.log("\n🔄 3615 학번 매핑 확인:");
    const { data: s3615 } = await supabase
        .from('students')
        .select('pid, name, student_id, academic_year, status')
        .eq('student_id', '3615');

    s3615.forEach(s => {
        console.log(`- PID: ${s.pid} | 이름: ${s.name} | 연도: ${s.academic_year} | 상태: ${s.status}`);
    });

    // 3. 기록 잘림 확인 (2410 배지민)
    console.log("\n📝 2410 배지민 기록 확인:");
    const { data: s2410 } = await supabase
        .from('students')
        .select('pid')
        .eq('student_id', '2410')
        .eq('academic_year', 2026)
        .single();

    if (s2410) {
        const { data: r2410 } = await supabase
            .from('life_records')
            .select('id, content')
            .eq('student_pid', s2410.pid);

        r2410.forEach(r => {
            console.log(`- 기록 ${r.id}: ${r.content.substring(0, 50)}... (전체길이: ${r.content.length})`);
        });
    }

    // 4. 1404, 1606 기록 소유자 확인
    const oldIds = ["1404", "1606"];
    console.log("\n📦 1404, 1606 매핑 상태:");
    const { data: oldStudents } = await supabase
        .from('students')
        .select('pid, name, student_id, academic_year')
        .in('student_id', oldIds);

    oldStudents.forEach(s => {
        console.log(`- [${s.student_id}] ${s.name} (${s.academic_year}) | PID: ${s.pid}`);
    });
}

checkIssues();
