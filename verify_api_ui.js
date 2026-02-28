import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyApi() {
    console.log("🔍 수정된 fetchGroupRecords (JOIN) 검증...");

    // api.js의 fetchGroupRecords 로직 모사
    let query = supabase
        .from('life_records')
        .select('*, students!inner(student_id, name, photo_url, class_info, academic_year)')
        .eq('students.academic_year', 2026)
        .limit(3);

    const { data, error } = await query;

    if (error) {
        console.error("❌ 에러:", error);
        return;
    }

    console.log(`✅ 데이터 ${data.length}건 수신`);
    data.forEach(r => {
        console.log(`- [${r.students.student_id}] ${r.students.name} | 사진: ${r.students.photo_url ? '있음' : '없음'}`);
        console.log(`  내용: ${r.content.substring(0, 30)}...`);
    });
}

verifyApi();
