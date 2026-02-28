import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkHistory() {
    console.log("🔍 student_history 테이블 데이터 확인...");

    const { data, error } = await supabase
        .from('student_history')
        .select('*')
        .limit(5);

    if (error) {
        console.error("❌ 에러:", error);
        return;
    }

    if (data.length === 0) {
        console.log("⚠️ student_history 테이블이 비어있습니다.");
        return;
    }

    console.log("📄 데이터 샘플:", data);
}

checkHistory();
