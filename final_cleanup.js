import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function finalCleanup() {
    console.log("🧹 최종 데이터 보정 및 학급 정보 업데이트...");

    // 1. 2026학년도 학생 전수 조회
    const { data: students } = await supabase
        .from('students')
        .select('pid, student_id, name, class_info')
        .eq('academic_year', 2026);

    for (const s of students) {
        // 학번 기반 학급 정보 생성 (예: 2316 -> 2-3)
        const expectedClass = `${s.student_id[0]}-${s.student_id[1]}`;

        if (s.class_info !== expectedClass) {
            await supabase.from('students').update({ class_info: expectedClass }).eq('pid', s.pid);
            console.log(`✅ [${s.name}] 학급 정보 수정: ${s.class_info} -> ${expectedClass}`);
        }
    }

    // 2. 임현묵 등 잔여 중복 확인 (이름과 학년도 기준)
    const nameMap = {};
    for (const s of students) {
        if (!nameMap[s.name]) nameMap[s.name] = [];
        nameMap[s.name].push(s);
    }

    for (const name in nameMap) {
        if (nameMap[name].length > 1) {
            console.log(`⚠️ [${name}] 중복 발견 (${nameMap[name].length}개)`);
            // 생활기록이 있는 쪽을 남기고 나머지를 지우는 로직 (또는 name_map.json과 대조)
            // 여기서는 수동으로 임현묵 등 처리
            if (name === "임현묵") {
                // PID 17013f44... 가 원본이므로 나머지를 삭제
                const toDelete = nameMap[name].find(s => s.pid !== '17013f44-78a0-4459-ae08-076b7409c3f3');
                if (toDelete) {
                    await supabase.from('students').delete().eq('pid', toDelete.pid);
                    console.log(`🗑️ [임현묵] 중복 2026 행 삭제 완료 (${toDelete.pid})`);
                }
            }
        }
    }

    console.log("\n✨ 최종 보정 완료!");
}

finalCleanup();
