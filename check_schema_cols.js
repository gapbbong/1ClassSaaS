import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    console.log("🔍 students 테이블 컬럼 전체 확인...");

    // 임의의 학생 한 명을 가져와서 모든 필드를 봅니다.
    const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error("❌ 에러:", error);
        return;
    }

    console.log("📄 학생 데이터 샘플 키 목록:", Object.keys(student));
    console.log("📄 학생 데이터 샘플:", student);
}

checkSchema();
