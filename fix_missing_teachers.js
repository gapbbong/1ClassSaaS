import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMissingTeachers() {
    const missingEmails = [
        { email: 'kbJseeun@naver.com', name: '김변정', role: 'nurse' },
        { email: 'duo0083@Nate.com', name: '박창우', role: 'subject_teacher' },
        { email: 'Jge0808@nate.com', name: '정고은', role: 'subject_teacher' },
    ];

    for (const info of missingEmails) {
        console.log(`\n🔍 ${info.name} (${info.email}) 복구 중...`);

        // 1. Auth 유저 찾기 (admin api 사용)
        const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();

        if (authErr) {
            console.log(`❌ Auth 리스트 불러오기 에러: ${authErr.message}`);
            continue;
        }

        const authUser = users.find(u => u.email.toLowerCase() === info.email.toLowerCase());

        if (!authUser) {
            console.log(`❌ Auth에도 유저가 없습니다. 가입이 필요합니다.`);
            continue;
        }

        console.log(`✅ Auth 유저 ID 확인: ${authUser.id}`);

        // 2. teachers 테이블에 있는지 확인
        const { data: teacher, error: findErr } = await supabase
            .from('teachers')
            .select('id')
            .eq('id', authUser.id)
            .maybeSingle();

        if (findErr) {
            console.log(`❌ DB 조회 에러: ${findErr.message}`);
            continue;
        }

        if (!teacher) {
            // 3. insert
            const { error: insertErr } = await supabase
                .from('teachers')
                .insert({
                    id: authUser.id,
                    email: info.email,
                    name: info.name,
                    role: info.role,
                });

            if (insertErr) {
                console.log(`❌ DB 등록 에러: ${insertErr.message}`);
            } else {
                console.log(`✅ DB 등록 완료! (${info.role})`);
            }
        } else {
            // 4. update
            const { error: updateErr } = await supabase
                .from('teachers')
                .update({
                    email: info.email,
                    name: info.name,
                    role: info.role,
                })
                .eq('id', authUser.id);

            if (updateErr) {
                console.log(`❌ DB 업데이트 에러: ${updateErr.message}`);
            } else {
                console.log(`✅ DB 업데이트 완료! (${info.role})`);
            }
        }
    }
}

fixMissingTeachers();
