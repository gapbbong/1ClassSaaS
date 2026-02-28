import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function normalize() {
    console.log("🛠️ PID 기반 학생 데이터 정규화 시작...");

    const nameMap = JSON.parse(fs.readFileSync('./name_map.json', 'utf8'));
    console.log(`📊 매핑 대상: ${nameMap.length}명`);

    let updatedCount = 0;
    let deletedDupes = 0;

    for (const item of nameMap) {
        if (item.academic_year !== 2026) continue;

        const originPid = item.pid;
        const targetId = item.student_id;
        const targetName = item.name;

        // 1. 원본 PID 행이 있는지 확인 (주로 2025년 데이터로 남아있을 것)
        const { data: originStudent } = await supabase
            .from('students')
            .select('*')
            .eq('pid', originPid)
            .single();

        if (!originStudent) {
            // 원본 PID가 없으면 (신규 학생 등) 일단 스킵하거나 출력
            // console.log(`ℹ️ [${targetName}] 원본 PID 없음 (신규생일 수 있음)`);
            continue;
        }

        // 2. 만약 이 원본 PID가 2025년으로 되어 있다면 2026년으로 업데이트
        if (originStudent.academic_year === 2025) {
            // 중복된 2026년 행이 있는지 확인 (이름과 학번 기준)
            const { data: dupeStudent } = await supabase
                .from('students')
                .select('pid')
                .eq('name', targetName)
                .eq('student_id', targetId)
                .eq('academic_year', 2026)
                .neq('pid', originPid) // 본인 제외
                .single();

            if (dupeStudent) {
                // 중복 행 삭제 전, 혹시라도 그 행에 붙은 기록이 있는지 확인 (안전을 위해)
                // (우리가 이전에 옮겼던 16건이 여기 있을 수 있음)
                // 삭제 처리
                const { error: dError } = await supabase
                    .from('students')
                    .delete()
                    .eq('pid', dupeStudent.pid);

                if (!dError) {
                    deletedDupes++;
                    console.log(`🗑️ [${targetName}] 중복 2026 행 삭제 완료 (${dupeStudent.pid})`);
                }
            }

            // 원본 행 업데이트
            const { error: uError } = await supabase
                .from('students')
                .update({
                    academic_year: 2026,
                    student_id: targetId,
                    updated_at: new Date().toISOString()
                })
                .eq('pid', originPid);

            if (!uError) {
                updatedCount++;
                console.log(`✅ [${targetName}] 원본 PID 행 2026년으로 업데이트 완료`);
            }
        }
    }

    console.log(`\n🎉 정규화 완료! 업데이트: ${updatedCount}건, 중복 삭제: ${deletedDupes}건`);
}

normalize().catch(err => console.error(err));
