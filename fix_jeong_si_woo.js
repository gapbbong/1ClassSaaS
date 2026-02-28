import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log("🔍 2-1반 정시우 학생 데이터 정밀 대조...");

    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2026)
        .eq('class_info', '2-1')
        .eq('name', '정시우');

    if (error) {
        console.error("데이터 조회 실패:", error.message);
        return;
    }

    console.log(`발견된 정시우 학생 수: ${students.length}명`);
    students.forEach(s => {
        console.log(`- [pid: ${s.pid}] 학번: ${s.student_id}, 사진: ${s.photo_url ? 'O' : 'X'}`);
    });

    if (students.length > 1) {
        // 사진이 있는 쪽을 남기거나, 학번이 더 큰 쪽을 남기는 등의 기준 적용
        // 여기선 이전 요청에서 2116을 유지한다고 했으므로 2115(또는 중복된 다른 것)를 삭제
        const toDelete = students.find(s => s.student_id === '2115');
        if (toDelete) {
            console.log(`🗑️ 불필요한 데이터 삭제 시도: ${toDelete.pid} (학번: ${toDelete.student_id})`);
            const { error: delErr } = await supabase.from('students').delete().eq('pid', toDelete.pid);
            if (delErr) console.error("삭제 실패:", delErr.message);
            else console.log("✅ 삭제 완료");
        } else {
            // 학번이 동일하게 중복된 경우 첫 번째 것 삭제
            const pidToDelete = students[0].pid;
            console.log(`🗑️ 중복 PID 삭제 시도: ${pidToDelete}`);
            const { error: delErr2 } = await supabase.from('students').delete().eq('pid', pidToDelete);
            if (delErr2) console.error("삭제 실패:", delErr2.message);
            else console.log("✅ 삭제 완료");
        }
    } else {
        console.log("이미 1명만 존재하거나 데이터가 없습니다.");
    }
})();
