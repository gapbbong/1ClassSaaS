import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function step1Clear3rdGrade() {
    console.log("🧹 [1단계] 3학년 공간 비우기 및 졸업 처리 시작...");

    // 2026학년도 3학년으로 설정된 모든 학생을 2025학년도 졸업생으로 격리
    const { data, error } = await supabase
        .from('students')
        .update({
            academic_year: 2025,
            status: 'graduated'
        })
        .eq('academic_year', 2026)
        .ilike('class_info', '3-%')
        .select();

    if (error) {
        console.error("❌ 3학년 데이터 격격 실패:", error.message);
    } else {
        console.log(`✅ ${data?.length || 0}명의 학생이 2025학년도 졸업생으로 격리되었습니다.`);
        console.log("📍 이제 2026학년도 3학년 공간이 공식적으로 비었습니다.");
    }
}

step1Clear3rdGrade();
