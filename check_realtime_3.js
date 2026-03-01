import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Life records 변경 사항을 감지하기 위해 Realtime을 초기화합니다.");

// 채널 생성 및 구독 시작
const channel = supabase.channel('my-test-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'life_records' }, payload => {
        console.log("\n\n🌈 => [이벤트 수신 성공!] payload:", payload);
    })
    .subscribe(async (status) => {
        console.log("구독 상태:", status);
        if (status === 'SUBSCRIBED') {
            const { data: students, error: fetchErr } = await supabase.from('students').select('pid, name').limit(1);
            if (fetchErr || !students || students.length === 0) {
                console.log("학생 로드 실패", fetchErr);
                return;
            }

            const student = students[0];
            console.log(`구독 성공! [${student.name}] 학생 대상으로 Insert를 진행합니다...`);

            const { error } = await supabase.from('life_records').insert([{
                student_pid: student.pid,
                category: '근태',
                content: '리얼타임 심화 검증 테스트 3',
                teacher_email_prefix: 'system',
                is_positive: false
            }]);
            if (error) console.error("Insert 실패:", error);
            else console.log("=> Insert 완료. 브로드캐스팅 수신 대기 중...");

            // 5초 대기 후 스크립트 종료
            setTimeout(() => {
                console.log("테스트 타임아웃.");
                process.exit();
            }, 5000);
        }
    });
