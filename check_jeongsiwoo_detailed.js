import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log("🔍 '정시우' 학생 검색 및 히스토리 조회...");

    // 1. 현재 학생 테이블 검색
    const { data: current, error } = await supabase
        .from('students')
        .select('*')
        .eq('name', '정시우');

    console.log("\n--- [현재 학생 테이블] ---");
    if (current) current.forEach(s => console.log(`- [pid: ${s.pid}] 학급: ${s.class_info}, 학번: ${s.student_id}, 생년월일: ${s.birth_date}`));

    // 2. 히스토리 테이블 검색 (삭제된 데이터가 있을 수 있음)
    const { data: history, error: err2 } = await supabase
        .from('students_history')
        .select('*')
        .eq('name', '정시우');

    console.log("\n--- [학생 히스토리 테이블] ---");
    if (history) history.forEach(s => console.log(`- [pid: ${s.pid}] 학급: ${s.class_info}, 학번: ${s.student_id}, 생년월일: ${s.birth_date}`));
})();
