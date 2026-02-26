import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpReal2025Grads() {
    console.log("🎓 [데이터 추출] 2025학년도 실제 3학년(졸업생) 이력 추출...");

    const { data: grads2025, error } = await supabase
        .from('student_history')
        .select('*')
        .eq('academic_year', 2025)
        .ilike('class_info', '3-%');

    if (error) {
        console.error("❌ 이력 추출 실패:", error.message);
        return;
    }

    console.log(`✅ 2025년 3학년(진짜 졸업생) 이력: ${grads2025?.length || 0}명 발견`);
    fs.writeFileSync('pool_2025_grads.json', JSON.stringify(grads2025, null, 2));
    console.log("💾 'pool_2025_grads.json' 저장 완료.");
}

dumpReal2025Grads();
