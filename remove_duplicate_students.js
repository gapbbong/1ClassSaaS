import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log("🔄 중복 학생 제거를 시작합니다 (사진 없는 데이터 우선)...");

    // 1. 모든 학생 데이터 가져오기 (2026학년도)
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2026);

    if (error) {
        console.error("❌ 학생 데이터 조회 실패:", error.message);
        return;
    }

    // 2. 중복 체크 (이름, 학번, 반 정보 기준)
    const studentMap = new Map();
    const toDelete = [];

    students.forEach(s => {
        const key = `${s.name}_${s.student_id}_${s.class_info}`;
        if (!studentMap.has(key)) {
            studentMap.set(key, s);
        } else {
            const existing = studentMap.get(key);
            // 사진이 있는 데이터를 남기고 없는 데이터를 삭제 후보로 등록
            if (!existing.photo_url && s.photo_url) {
                toDelete.push(existing.pid);
                studentMap.set(key, s);
                console.log(`📍 중복 발견 (사진 있음 교체): ${s.name} (${s.student_id})`);
            } else {
                toDelete.push(s.pid);
                console.log(`📍 중복 발견 (삭제 대기): ${s.name} (${s.student_id})`);
            }
        }
    });

    if (toDelete.length === 0) {
        console.log("✅ 중복된 학생이 없습니다.");
        return;
    }

    console.log(`🗑️ 총 ${toDelete.length}명의 중복 데이터를 삭제합니다...`);

    for (const pid of toDelete) {
        const { error: delError } = await supabase
            .from('students')
            .delete()
            .eq('pid', pid);

        if (delError) console.error(`❌ 삭제 실패 (pid: ${pid}):`, delError.message);
        else console.log(`✅ 삭제 완료 (pid: ${pid})`);
    }

    console.log("🎉 중복 학생 제거 완료!");
})();
