import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function restoreRecords() {
    console.log("🛠️ 생활기록 원본 PID 복원 시작...");

    const nameMap = JSON.parse(fs.readFileSync('./name_map.json', 'utf8'));

    // 학번 -> 원본 PID 맵 생성 (2026 대상)
    const idToPid = {};
    nameMap.forEach(item => {
        if (item.academic_year === 2026) {
            idToPid[item.student_id] = item.pid;
        }
    });

    // 1. 현재 잘못 연결되었을 가능성이 있는 기록들 조회 (2025-12 ~ 2026-01 기록)
    // 이 기록들은 원래 2025년 학번에 연동되어 있었음.
    const { data: records, error } = await supabase
        .from('life_records')
        .select(`
            id,
            content,
            students!inner (
                student_id,
                name,
                academic_year
            )
        `)
        .gte('created_at', '2025-12-01')
        .lte('created_at', '2026-02-01');

    if (error) throw error;

    let restoredCount = 0;

    for (const r of records) {
        // 이 기록의 진짜 주인인 2025년 행의 정보를 찾기 (이전 학번 기준)
        // (현재 r.students.student_id가 1319 등 이전 학번이라면, 우리는 name_map에서 2026년의 정보를 찾아야 함?)
        // 아, 생활기록.csv에는 '이전 학번'이 적혀 있음.

        // 하지만 name_map.json에는 2026년 학번에 대해 원본 PID가 적혀있음.
        // 우리는 2025년 학생을 찾아서 그 PID를 그대로 써야 함.

        const currentStudent = r.students;

        // 만약 현재 연결된 학생이 2025년 학생이라면 (PID도 그 학생의 것) -> 그대로 두면 됨 (normalize에서 그 행을 2026으로 바꿀 것이므로)
        // 만약 현재 연결된 학생이 2026년 신규 학생이라면 (PID가 b8f5... 등) -> 원본 PID로 바꿔야 함.

        // 우리가 'correct_record_mapping'에서 이미 2026 신규 PID로 옮겨버렸다면 (= r.students.academic_year == 2026)
        if (currentStudent.academic_year === 2026) {
            // 이 학생의 이름을 name_map에서 찾아서 진짜 PID(원본)를 가져옴
            const mapping = nameMap.find(m => m.name === currentStudent.name && m.academic_year === 2026);

            if (mapping && mapping.pid !== r.student_pid) {
                const { error: uError } = await supabase
                    .from('life_records')
                    .update({ student_pid: mapping.pid })
                    .eq('id', r.id);

                if (!uError) {
                    console.log(`✅ 기록 ${r.id} (${currentStudent.name}): 신규 PID -> 원본 PID(${mapping.pid}) 복원`);
                    restoredCount++;
                }
            }
        }
    }

    console.log(`\n🎉 복원 완료! 총 ${restoredCount}건 실제 PID로 복귀.`);
}

restoreRecords().catch(err => console.error(err));
