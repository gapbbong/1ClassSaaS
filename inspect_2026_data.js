import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspect2026() {
    const ids = ["2411", "2410", "3301", "1404", "1606"];
    const { data: students } = await supabase
        .from('students')
        .select('pid, student_id, name, photo_url, academic_year')
        .in('student_id', ids)
        .eq('academic_year', 2026);

    console.log("📊 2026학년도 타겟 학생 현황:");
    students.forEach(s => {
        console.log(`- [${s.student_id}] ${s.name} | PID: ${s.pid} | Photo: ${s.photo_url ? 'OK' : 'MISSING'}`);
    });

    const names = ["김우진", "김민수", "김은결", "배지민", "차지연", "조현용", "안우진"];
    const { data: byNames } = await supabase
        .from('students')
        .select('pid, student_id, name, academic_year, status')
        .in('name', names);

    console.log("\n👥 이름 기준 검색 결과 (전체 연도):");
    byNames.forEach(s => {
        console.log(`- ${s.name} (${s.academic_year}) | ID: ${s.student_id} | Status: ${s.status} | PID: ${s.pid}`);
    });
}

inspect2026();
