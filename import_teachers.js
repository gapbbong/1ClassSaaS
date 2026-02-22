/**
 * import_teachers.js
 *
 * 구글 시트 "교사명단"을 CSV로 내보낸 파일(Teachers.csv)을 읽어
 * Supabase auth.users 및 teachers 테이블로 이관합니다.
 *
 * [실행]
 * node import_teachers.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 .env 파일에 없습니다.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.map(line => {
        const cols = [];
        let cur = '';
        let inQuote = false;
        for (const ch of line) {
            if (ch === '"') { inQuote = !inQuote; }
            else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
            else { cur += ch; }
        }
        cols.push(cur.trim());
        return cols;
    });
}

(async () => {
    const csvPath = path.join(__dirname, 'Teachers.csv');

    if (!fs.existsSync(csvPath)) {
        console.error('❌ Teachers.csv 파일이 없습니다. 이 폴더에 저장해주세요.');
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(csvPath);
    // EUC-KR(또는 CP949)로 먼저 디코딩 시도 (엑셀 저장 기본값)
    const fileContent = iconv.decode(fileBuffer, 'euc-kr');
    let dataRows = parseCSV(fileContent);

    // 헤더 체크 및 제거 (무조건 첫 번째 줄은 컬럼 명칭이므로 지움)
    dataRows.shift();
    console.log(`📋 헤더 제거 완료. 총 ${dataRows.length}개의 데이터 발견`);

    let successCount = 0;
    let skippedCount = 0;
    let updateCount = 0;

    for (const r of dataRows) {
        if (r.length < 2) continue;

        const email = r[0]?.trim();
        const name = r[1]?.trim();
        if (!email || !name) continue;

        const mainGrade = r[2]?.trim();
        const mainClass = r[3]?.trim();

        // 서브학년, 반도 있을 수 있지만 DB 스키마상 assigned_class 하나만 넣습니다.
        let assigned_class = null;
        let role = 'subject_teacher';

        if (mainGrade && mainClass) {
            assigned_class = `${mainGrade}-${mainClass}`;
            role = 'homeroom_teacher';
        }

        try {
            // 1. 기존에 등록된 선생님인지 확인
            const { data: existing, error: findErr } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (findErr) throw findErr;

            let targetId = null;

            if (!existing) {
                // 2. 미등록인 경우 회원가입 (Auth 계정 생성)
                const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
                    email: email,
                    password: 'password123!', // 임시 초기 비밀번호
                    email_confirm: true,
                    user_metadata: { name: name }
                });

                if (createErr) {
                    console.error(`❌ 계정 생성 실패 (${name}/ ${email}):`, createErr.message);
                    skippedCount++;
                    continue;
                }

                targetId = authData.user.id;
                console.log(`✅ [신규생성] ${name} (${email}) 계정 생성 완료!`);
                successCount++;

                // Auth trigger 가 비동기로 실행되므로 1초 대기 후 업데이트
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                targetId = existing.id;
                updateCount++;

                // 기존 깨진 이름 복구용 auth update
                const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(
                    targetId,
                    { user_metadata: { name: name } }
                );
            }

            // 3. 권한 및 담당 학급 업데이트
            const { error: updateErr } = await supabase
                .from('teachers')
                .update({
                    role: role,
                    assigned_class: assigned_class,
                    name: name // 기존 데이터 혹시나 해서 강제 업데이트 (깨진 이름 덮어쓰기)
                })
                .eq('id', targetId);

            if (updateErr) {
                console.error(`❌ 정보 업데이트 실패 (${name}):`, updateErr.message);
            }

        } catch (e) {
            console.error(`❌ 에러 발생 (${name}/${email}):`, e.message);
            skippedCount++;
        }
    }

    console.log('------------------------------------------------');
    console.log(`🎉 이관 완료! 신규 가입: ${successCount}건, 정보 갱신: ${updateCount}건, 건너뜀: ${skippedCount}건`);
    console.log(`=> 초기 비밀번호는 모두 'password123!' 으로 설정되었습니다.`);
    console.log('------------------------------------------------');
})();
