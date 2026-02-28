import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log("🔍 2025학년도 교사 연락처 데이터 추출 시작...");

    // teachers_history 테이블이나 teachers 테이블에서 2025년도 데이터를 찾습니다.
    // 이전 로그에서 teachers 테이블에 phone이 있는 것을 확인했으므로, 
    // 성명을 기준으로 매핑 테이블을 만듭니다.

    const { data: teachers, error } = await supabase
        .from('teachers')
        .select('name, phone')
        .not('phone', 'is', null);

    if (error) {
        console.error("교사 데이터 조회 실패:", error.message);
        return;
    }

    const phoneMap = {};
    teachers.forEach(t => {
        if (t.phone && t.phone.startsWith('010')) {
            phoneMap[t.name] = t.phone;
        }
    });

    console.log(`✅ ${Object.keys(phoneMap).length}명의 연락처 맵 생성 완료.`);

    // 현재 2026학년도 교사 중 연락처가 없는 분들을 찾아서 업데이트
    const { data: currentTeachers, error: err2 } = await supabase
        .from('teachers')
        .select('*')
        .or('phone.is.null,phone.eq.""');

    if (err2) {
        console.error("현재 교사 조회 실패:", err2.message);
        return;
    }

    console.log(`\n📝 연락처 업데이트 시도 (${currentTeachers.length}명 대상):`);
    let updatedCount = 0;

    for (const t of currentTeachers) {
        const savedPhone = phoneMap[t.name];
        if (savedPhone) {
            console.log(`  - [${t.name}] 업데이트: ${savedPhone}`);
            const { error: updErr } = await supabase
                .from('teachers')
                .update({ phone: savedPhone })
                .eq('id', t.id);

            if (updErr) console.error(`    ❌ ${t.name} 업데이트 실패:`, updErr.message);
            else updatedCount++;
        }
    }

    console.log(`\n🎉 총 ${updatedCount}명의 연락처가 복구되었습니다.`);
})();
