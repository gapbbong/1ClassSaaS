import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log("🛠️ 특정 학급 데이터 수정을 시작합니다...");

    // 1. 2-1반 중복 (타 학급 데이터 오입력 건)
    const pidsToDelete = [
        'b87f06a1-13ae-4791-bd00-79dfbbe87c01', // 2-1 전현욱 (2114) -> 2-2에 이미 있음
        '936afa27-dfe9-44e2-b647-7e1117c8832b', // 2-1 정유준 (2115) -> 2-2에 이미 있음
        'f2cb8bed-e2ab-4e3d-9d72-7bf505f44f1a', // 2-2 IBRAHIMSANAULLAH (공백 없는 버전 삭제)
        'c35b09fa-aea9-4286-8266-32e2a1ff1efb'  // 2-5 학생_2503 (더미 데이터 삭제)
    ];

    for (const pid of pidsToDelete) {
        const { error } = await supabase.from('students').delete().eq('pid', pid);
        if (error) console.error(`❌ 삭제 실패 (pid: ${pid}):`, error.message);
        else console.log(`✅ 삭제 완료: ${pid}`);
    }

    // 2-2반 번호 중복 건은 사용자가 "1번 두번"이라고만 했으므로 나머지는 지켜보거나 번호 수정을 고려해야 함.
    // 하지만 2-2반 11번이 두 명이고 12번이 없는 것으로 보아 한 명을 12번으로 옮겨야 할 수 있음.
    // 2-2반 5번도 두 명 임.

    console.log("🎉 요청된 명확한 오류 수정 완료!");
})();
