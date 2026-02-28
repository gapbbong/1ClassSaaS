import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPromotion() {
    console.log("🔍 학생 진급 데이터 비교 (이름 기준)...");

    const targetName = "최현수"; // 진단에서 확인된 학생 이름

    console.log(`\n👤 [${targetName}] 학생 데이터 조회:`);
    const { data: students } = await supabase
        .from('students')
        .select('pid, student_id, academic_year, class_info')
        .eq('name', targetName)
        .order('academic_year', { ascending: true });

    students.forEach(s => {
        console.log(`- ${s.academic_year}년도: 학번 ${s.student_id} | 반 ${s.class_info} | PID: ${s.pid}`);
    });

    console.log("\n🧪 16건의 기록이 현재 연결된 상태:");
    const { data: records } = await supabase
        .from('life_records')
        .select(`
            id,
            student_pid,
            students(name, student_id, academic_year)
        `)
        .limit(5); // 샘플 5건

    records.forEach(r => {
        console.log(`- 기록ID ${r.id}: 학생 ${r.students?.name} | 학년도 ${r.students?.academic_year} | 표시학번 ${r.students?.student_id}`);
    });
}

checkPromotion();
