import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function mapNames() {
    console.log("🧩 [매핑] PID -> 실명 매핑 데이터 생성...");

    const g1 = JSON.parse(fs.readFileSync('pool_2025_g1.json', 'utf8'));
    const g2 = JSON.parse(fs.readFileSync('pool_2025_g2.json', 'utf8'));
    const allPids = [...g1, ...g2].map(h => h.student_pid);

    const { data: students } = await supabase
        .from('students')
        .select('pid, name, student_id, academic_year, status')
        .in('pid', allPids);

    console.log(`✅ ${students?.length || 0}명의 실명 데이터 조회 완료.`);

    fs.writeFileSync('name_map.json', JSON.stringify(students, null, 2));
    console.log("💾 'name_map.json' 저장 완료.");
}

mapNames();
