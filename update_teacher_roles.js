import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const roleUpdates = [
    { name: '이갑종', role: 'admin', newEmail: 'gapbbong@naver.com' }, // 소유자
    { name: '이경원', role: 'admin' }, // 관리자
    { name: '류기현', role: 'admin' }, // 관리자
    { name: '이경미', role: 'counselor' }, // 상담
    { name: '김변정', role: 'nurse' }, // 보건
    { name: '이상수', role: 'admin' } // 생활지도부장 (관리자로 권한 부여)
];

async function updateRoles() {
    console.log("🔄 교사 정보 및 권한 업데이트를 시작합니다...");

    for (const update of roleUpdates) {
        // 1. 선생님 찾기 (이름으로)
        const { data: teachers, error } = await supabase
            .from('teachers')
            .select('id, email')
            .eq('name', update.name);

        if (error || !teachers || teachers.length === 0) {
            console.log(`❌ ${update.name} 선생님을 DB에서 찾을 수 없습니다.`);
            continue;
        }

        // 동명이인이 있을 수 있지만, 여기서는 첫 번째 데이터를 사용
        const teacher = teachers[0];

        // 2. 이메일 업데이트가 필요한 경우 (Auth + public.teachers 동시 업데이트)
        if (update.newEmail && teacher.email !== update.newEmail) {
            console.log(`   [${update.name}] 선생님 이메일 변경 진행 중: ${teacher.email} -> ${update.newEmail}`);

            const { error: authErr } = await supabase.auth.admin.updateUserById(
                teacher.id,
                { email: update.newEmail, email_confirm: true }
            );

            if (authErr) {
                console.log(`❌ Auth 이메일 변경 오류 (${update.name}): ${authErr.message}`);
            } else {
                const { error: dbErr } = await supabase
                    .from('teachers')
                    .update({ email: update.newEmail })
                    .eq('id', teacher.id);

                if (dbErr) {
                    console.log(`❌ DB 이메일 변경 오류 (${update.name}): ${dbErr.message}`);
                } else {
                    console.log(`✅ ${update.name} 선생님의 이메일이 ${update.newEmail}로 성공적으로 변경되었습니다.`);
                }
            }
        }

        // 3. 권한 업데이트
        const { error: roleErr } = await supabase
            .from('teachers')
            .update({ role: update.role })
            .eq('id', teacher.id);

        if (roleErr) {
            console.log(`❌ 권한 변경 오류 (${update.name}): ${roleErr.message}`);
        } else {
            console.log(`✅ ${update.name} 선생님의 권한이 '${update.role}'(으)로 변경되었습니다.`);
        }
    }

    console.log("🎉 업데이트 작업이 모두 완료되었습니다!");
}

updateRoles();
