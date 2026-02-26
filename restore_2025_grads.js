import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restore2025Grads() {
    console.log("🛠️ [복구] 2025학년도 실제 졸업생 데이터 정합성 복구...");

    const poolGrads = JSON.parse(fs.readFileSync('pool_2025_grads.json', 'utf8'));

    // 이력 데이터에 있는 PID들의 현재 이름 정보를 Students 테이블에서 가져옴
    const pids = poolGrads.map(h => h.student_pid);
    const { data: currentStudents } = await supabase
        .from('students')
        .select('pid, name');

    const nameMap = {};
    currentStudents?.forEach(s => { nameMap[s.pid] = s.name; });

    let successCount = 0;

    for (const h of poolGrads) {
        // 이력에 기록된 당시의 정보로 Students 테이블 업데이트 (졸업생 상태 유지)
        const { error } = await supabase
            .from('students')
            .update({
                academic_year: 2025,
                status: 'graduated',
                class_info: h.class_info,
                student_id: h.student_id
            })
            .eq('pid', h.student_pid);

        if (!error) successCount++;
    }

    console.log(`✅ ${successCount}명의 진짜 졸업생 데이터가 2025년 당시 정보로 복원되었습니다.`);

    // 결과 출력용 (3-1반 예시)
    console.log("\n📦 [복구된 3-1반 졸업생 맛보기]");
    const { data: sample } = await supabase
        .from('students')
        .select('student_id, name')
        .eq('status', 'graduated')
        .eq('academic_year', 2025)
        .eq('class_info', '3-1')
        .order('student_id');

    console.log(sample?.map(s => `${s.student_id} ${s.name}`).join(', ') || "없음");
}

restore2025Grads();
