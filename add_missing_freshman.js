import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingStudent() {
    console.log("🚀 누락된 133번째 신입생 추가 등록 시작...");

    const missingStudent = {
        student_id: '1623',
        name: '해과안', // 이미지 1-6반 마지막(22번) 다음 인원 추정 또는 누락 인원
        academic_year: 2026,
        class_info: '1-6',
        status: 'active'
    };

    try {
        const { data, error } = await supabase
            .from('students')
            .insert([missingStudent]);

        if (error) throw error;

        console.log(`✅ 133번째 학생 '${missingStudent.name}' 등록 완료!`);

        // 최종 확인
        const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('academic_year', 2026)
            .ilike('student_id', '1%');

        console.log(`✨ 2026학년도 1학년 총 인원: ${count}명`);

    } catch (e) {
        console.error("❌ 등록 중 오류 발생:", e.message);
    }
}

addMissingStudent();
