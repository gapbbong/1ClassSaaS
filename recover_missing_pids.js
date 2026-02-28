import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMissing() {
    console.log("🔍 name_map.json과 DB 대조 중...");
    const nameMap = JSON.parse(fs.readFileSync('./name_map.json', 'utf8'));

    let missingCount = 0;
    const missingItems = [];

    for (const item of nameMap) {
        if (item.academic_year !== 2026) continue;

        const { data, error } = await supabase
            .from('students')
            .select('pid, name')
            .eq('pid', item.pid)
            .single();

        if (error || !data) {
            missingCount++;
            missingItems.push(item);
            console.log(`❌ 누락: [${item.name}] PID:${item.pid} 학번:${item.student_id}`);
        }
    }

    console.log(`\n📊 총 누락 학생: ${missingCount}명`);

    if (missingItems.length > 0) {
        console.log("🔨 누락 학생 복구 중...");
        const insertData = missingItems.map(item => ({
            pid: item.pid,
            name: item.name,
            student_id: item.student_id,
            academic_year: 2026,
            class_info: `${item.student_id[0]}-${item.student_id[1]}`, // 간이 추정 (2112 -> 2-1)
            status: 'active'
        }));

        const { error: iError } = await supabase.from('students').insert(insertData);
        if (iError) console.error("❌ 복구 실패:", iError);
        else console.log(`✅ ${insertData.length}명 복구 완료!`);
    }
}

checkMissing();
