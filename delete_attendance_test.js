import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAttendanceRecords() {
    console.log("🚀 근태 기록 삭제 시작...");

    try {
        const { count, error } = await supabase
            .from('life_records')
            .delete({ count: 'exact' })
            .eq('category', '근태');

        if (error) throw error;

        console.log(`✅ 총 ${count}건의 '근태' 관련 테스트 기록이 삭제되었습니다.`);
    } catch (e) {
        console.error("❌ 삭제 중 오류 발생:", e);
    }
}

deleteAttendanceRecords();
