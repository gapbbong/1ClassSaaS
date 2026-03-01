import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Life records 실시간 감지를 시작합니다...");

supabase
    .channel('public:life_records')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'life_records' }, payload => {
        console.log("실시간 이벤트 감지됨!", payload);
    })
    .subscribe((status) => {
        console.log("구독 상태:", status);
        if (status === 'SUBSCRIBED') {
            console.log("성공적으로 구독되었습니다. 테스트 데이터를 주입합니다...");
            insertTestRecord();
        }
    });

async function insertTestRecord() {
    const { data: students } = await supabase
        .from('students')
        .select('pid')
        .eq('status', 'active')
        .limit(1);

    if (students && students.length > 0) {
        await supabase.from('life_records').insert([{
            student_pid: students[0].pid,
            category: '근태',
            content: '실시간 감지용 조퇴 테스트',
            teacher_email_prefix: 'system',
            is_positive: false
        }]);
        console.log("테스트 데이터 삽입 완료. 이벤트 출력을 기다립니다...");
    }
}
