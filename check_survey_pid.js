import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSurveyData() {
    console.log("🔍 최현수(PID: 3e277916...)의 설문 데이터 확인...");

    const { data: surveys, error } = await supabase
        .from('surveys')
        .select('data')
        .eq('student_pid', '3e277916-545d-42b9-9e33-25a8693b6748');

    if (error) {
        console.error("❌ 에러:", error);
        return;
    }

    if (surveys.length === 0) {
        console.log("⚠️ 설문 데이터가 없습니다.");
    } else {
        console.log("📄 설문 데이터 샘플:", JSON.stringify(surveys[0].data, null, 2));
    }
}

checkSurveyData();
