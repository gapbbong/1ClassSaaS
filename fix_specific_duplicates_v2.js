import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log("🛠️ 2차 정밀 수정을 시작합니다...");

    // 1. 2-2반 김윤우 (오입력) 삭제
    const { error: err1 } = await supabase.from('students').delete().eq('pid', 'b5bb84c3-88e9-440b-b083-bbdf7f2afc75');
    if (err1) console.error("❌ 2-2 김윤우 삭제 실패:", err1.message);
    else console.log("✅ 2-2 김윤우 삭제 완료");

    // 2. 2-1반 정시우 (2115 중복) 삭제
    const { error: err2 } = await supabase.from('students').delete().eq('pid', 'cf5e70db-91af-44d1-a20d-32f80eccb07b');
    if (err2) console.error("❌ 2-1 정시우(2115) 삭제 실패:", err2.message);
    else console.log("✅ 2-1 정시우(2115) 삭제 완료");

    // 3. 2-2반 이정민 학번 교정 (2211 -> 2212)
    const { error: err3 } = await supabase.from('students').update({ student_id: '2212' }).eq('pid', 'fc97816c-bb1d-47ca-a9ea-f3bf7383e740');
    if (err3) console.error("❌ 2-2 이정민 학번 수정 실패:", err3.message);
    else console.log("✅ 2-2 이정민 학번 수정 완료 (2212)");

    // 4. 추가로 2-2반 김재안(2205)과 김윤우 중복이 해결되었고, 11/12번도 해결됨.

    console.log("🎉 2차 정밀 수정 완료!");
})();
