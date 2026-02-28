import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_EMAIL = "lkm9912@hanmail.net";
const CORRECT_NAME = "이경미";
const ASSIGNED_CLASS = "2-5";

(async () => {
    console.log(`🛠️ 2학년 5반 부담임 정보 교정 중: ${TARGET_EMAIL}`);

    // 1. 정보 업데이트 (이름, 역할, 담당학급)
    const { error: updateError } = await supabase
        .from('teachers')
        .update({
            name: CORRECT_NAME,
            assigned_class: ASSIGNED_CLASS,
            role: 'subject_teacher'
        })
        .eq('email', TARGET_EMAIL);

    if (updateError) {
        console.error("❌ 업데이트 실패:", updateError.message);
    } else {
        console.log(`✅ ${CORRECT_NAME} 선생님(2-5 부담임) 정보 업데이트 완료!`);

        // 2. 결과 확인
        const { data, error: fetchError } = await supabase
            .from('teachers')
            .select('*')
            .eq('email', TARGET_EMAIL)
            .single();

        if (!fetchError && data) {
            console.log("------------------------------------------------");
            console.log(`[확인된 정보]`);
            console.log(`- 성함: ${data.name}`);
            console.log(`- 역할: ${data.role}`);
            console.log(`- 담당학급: ${data.assigned_class}`);
            console.log(`- 전화번호: ${data.phone || '미등록'}`);
            console.log("------------------------------------------------");
        }
    }
})();
