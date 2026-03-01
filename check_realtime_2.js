import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Life records 변경 사항을 감지하기 위해 Realtime을 초기화합니다.");

// 채널 생성 및 구독 시작
const channel = supabase.channel('any-channel-name')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'life_records' }, payload => {
        console.log("=> 수신된 이벤트 payload:", JSON.stringify(payload, null, 2));
    })
    .subscribe(async (status) => {
        console.log("구독 상태:", status);
        if (status === 'SUBSCRIBED') {
            console.log("구독 성공! 임의로 또 다른 조퇴 기록을 주입합니다...");

            const { data } = await supabase.from('students').select('pid, name').eq('student_id', '2401').single();
            if (data) {
                const { error } = await supabase.from('life_records').insert([{
                    student_pid: data.pid,
                    category: '근태',
                    content: '리얼타임 심화 검증 테스트',
                    teacher_email_prefix: 'system',
                    is_positive: false
                }]);
                if (error) console.error("Insert 실패:", error);
                else console.log("=> Insert 완료. 몇 초 내에 이벤트가 들어와야 합니다...");
            }

            // 5초 대기 후 스크립트 종료
            setTimeout(() => {
                console.log("테스트 종료.");
                process.exit();
            }, 5000);
        }
    });
