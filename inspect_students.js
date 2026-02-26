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

async function inspectStudents() {
    console.log("🔍 [분석] 학년도별/학급별 데이터 현황...");

    // 1. 2025학년도 2학년 (올해 3학년 진급 대상)
    const { data: y2025_g2 } = await supabase
        .from('students')
        .select('student_id, name, class_info, status')
        .eq('academic_year', 2025)
        .ilike('student_id', '2%')
        .order('student_id');

    console.log(`\n📅 2025학년도 2학년 총원: ${y2025_g2?.length || 0}명`);
    // console.log(JSON.stringify(y2025_g2));

    // 2. 2026학년도 2학년 (현재 재학생)
    const { data: y2026_g2 } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2026)
        .ilike('class_info', '2-%');

    // 3. 2026학년도 3학년 (현재 재학생)
    const { data: y2026_g3 } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2026)
        .ilike('class_info', '3-%');

    // 4. 2025학년도 졸업생 (격리된 데이터)
    const { data: grads } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2025)
        .eq('status', 'graduated');

    console.log(`\n📅 2026학년도 2학년 총원: ${y2026_g2?.length || 0}명`);
    console.log(`📅 2026학년도 3학년 총원: ${y2026_g3?.length || 0}명`);
    console.log(`🎓 2025학년도 졸업생 총원: ${grads?.length || 0}명`);

    // 4. 특정 문제 학생(김상원 등) 정밀 추적
    const { data: sangwon } = await supabase
        .from('students')
        .select('*')
        .eq('name', '김상원');
    console.log(`\n🔎 '김상원' 추적 결과:`, JSON.stringify(sangwon));
}

inspectStudents();
