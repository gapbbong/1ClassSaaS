import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log("🔍 전공(전체) 학생 중복 성명 전수 조사...");

    const { data: students, error } = await supabase
        .from('students')
        .select('pid, name, student_id, class_info')
        .eq('academic_year', 2026);

    if (error) {
        console.error("데이터 조회 실패:", error.message);
        return;
    }

    const nameMap = new Map();
    students.forEach(s => {
        if (!nameMap.has(s.name)) nameMap.set(s.name, []);
        nameMap.get(s.name).push(s);
    });

    console.log("\n--- [2개 이상의 학급/학번에 존재하는 학생 목록] ---");
    for (const [name, list] of nameMap) {
        if (list.length > 1) {
            // 같은 학급 내 중복은 이미 앞선 스크립트에서 어느 정도 걸러졌을 것이므로, 
            // 여기서는 학급/학번이 다른 경우를 중점적으로 봅니다.
            const uniqueEntries = new Set(list.map(s => `${s.class_info}_${s.student_id}`));
            if (uniqueEntries.size > 1) {
                console.log(`\n📍 성명: ${name}`);
                list.forEach(s => {
                    console.log(`  - [pid: ${s.pid}] 학급: ${s.class_info}, 학번: ${s.student_id}`);
                });
            }
        }
    }
})();
