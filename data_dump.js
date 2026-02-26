import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fullDataDump() {
    console.log("📦 [데이터 덤프] 복구용 원본 데이터 추출...");

    // 1. 2025학년도 1학년 명단 (올해 2학년 대상)
    const { data: g1_2025 } = await supabase
        .from('student_history')
        .select('*')
        .eq('academic_year', 2025)
        .ilike('class_info', '1-%');

    // 2. 2025학년도 2학년 명단 (올해 3학년 대상)
    const { data: g2_2025 } = await supabase
        .from('student_history')
        .select('*')
        .eq('academic_year', 2025)
        .ilike('class_info', '2-%');

    console.log(`\n✅ 2025년 1학년: ${g1_2025?.length || 0}명 추출`);
    console.log(`✅ 2025년 2학년: ${g2_2025?.length || 0}명 추출`);

    fs.writeFileSync('pool_2025_g1.json', JSON.stringify(g1_2025, null, 2));
    fs.writeFileSync('pool_2025_g2.json', JSON.stringify(g2_2025, null, 2));

    console.log("💾 'pool_2025_g1.json', 'pool_2025_g2.json' 저장 완료.");
}

fullDataDump();
