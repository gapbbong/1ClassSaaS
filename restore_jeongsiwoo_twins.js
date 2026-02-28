import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log("🛠️ 정시우 동명이인 데이터 복구 및 정정을 재시도합니다 (gender 컬럼 반영)...");

    // 1. 현재 모든 '정시우' 조회
    const { data: allSiwoo, error: err1 } = await supabase
        .from('students')
        .select('*')
        .eq('name', '정시우');

    if (err1) {
        console.error("조회 실패:", err1.message);
        return;
    }

    // 2-1반 16번 (2116) - 생년월일 2009.08.04, 성별 남 업데이트
    const siwoo16 = allSiwoo.find(s => s.student_id === '2116' && s.class_info === '2-1' && s.academic_year === 2026);
    if (siwoo16) {
        console.log(`✅ 2-1반 16번(2116) 발견: 정보 업데이트 (2009.08.04)`);
        await supabase.from('students').update({
            birth_date: '2009-08-04',
            gender: '남'
        }).eq('pid', siwoo16.pid);
    }

    // 2-1반 15번 (2115) - 복구 또는 생성
    const siwoo15 = allSiwoo.find(s => s.student_id === '2115' && s.class_info === '2-1' && s.academic_year === 2026);
    if (!siwoo15) {
        console.log(`⚠️ 2-1반 15번(2115) 누락: 신규 생성 (2009.06.10)`);
        // 1학년 2반 16번이었던 학생의 사진 정보 활용
        const prevSiwoo = allSiwoo.find(s => s.class_info === '1-2' && s.student_id === '1216');

        const newRecord = {
            name: '정시우',
            student_id: '2115',
            class_info: '2-1',
            birth_date: '2009-06-10',
            gender: '남',
            academic_year: 2026,
            photo_url: prevSiwoo ? prevSiwoo.photo_url : null,
            status: 'active'
        };

        const { data: inserted, error: insErr } = await supabase.from('students').insert([newRecord]).select();
        if (insErr) console.error("   ❌ 생성 실패:", insErr.message);
        else console.log("   ✅ 2-1반 15번(2115) 정시우 신규 생성 완료");
    } else {
        console.log(`✅ 2-1반 15번(2115) 이미 존재: 정보 업데이트 (2009.06.10)`);
        await supabase.from('students').update({
            birth_date: '2009-06-10',
            gender: '남'
        }).eq('pid', siwoo15.pid);
    }

    console.log("🎉 정시우 동명이인 정정 작업 완료!");
})();
