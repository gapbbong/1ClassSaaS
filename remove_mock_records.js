import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function removeMockRecords() {
    console.log("테스트용으로 생성된 조퇴/외출 기록을 삭제합니다...");

    const { error: deleteError } = await supabase
        .from('life_records')
        .delete()
        .eq('teacher_email_prefix', 'test_teacher');

    if (deleteError) {
        console.error("기록 삭제 실패:", deleteError);
    } else {
        console.log("✅ 테스트용 외출/조퇴 기록이 모두 성공적으로 삭제되었습니다!");
    }
}

removeMockRecords();
