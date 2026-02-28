import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixIssues() {
    console.log("🛠️ 피드백 반영 및 데이터 정정 시작...");

    // 1. 사진 매핑 수정 (3301 HAN PANG WEN)
    // HANPANGWEN(공백없음)의 사진을 HAN PANG WEN(공백있음)에게 복사
    const { data: han1 } = await supabase.from('students').select('photo_url').eq('name', 'HANPANGWEN').single();
    if (han1 && han1.photo_url) {
        await supabase.from('students').update({ photo_url: han1.photo_url }).eq('name', 'HAN PANG WEN').eq('academic_year', 2026);
        console.log("✅ 3301 HAN PANG WEN 사진 복구 완료");
    }

    // 2. 2411 김우진 사진 확인 (안우진 사진이 2411에 매핑된 경우 수정)
    // 2411 안우진의 사진을 2411 김우진에게 복사 (사용자 의도 추정)
    const { data: an } = await supabase.from('students').select('photo_url').eq('name', '안우진').eq('student_id', '2411').single();
    if (an && an.photo_url) {
        await supabase.from('students').update({ photo_url: an.photo_url }).eq('name', '김우진').eq('academic_year', 2026);
        console.log("✅ 2411 김우진 사진 복구 완료");
    }

    // 3. 기록 오매핑 수정 (3615 차지연 졸업생 기록 원복)
    // 조현용(2026) -> 차지연(2025 졸업생)
    const chapi = '0e21936f-0f37-441e-8877-d53cbc649bd1'; // 차지연 PID
    const johon = 'beff940e-ee1b-4c31-8303-5aad61b1f654'; // 조현용 PID

    const { count: c3615 } = await supabase.from('life_records').select('*', { count: 'exact', head: true }).eq('student_pid', johon);
    if (c3615 > 0) {
        await supabase.from('life_records').update({ student_pid: chapi }).eq('student_pid', johon);
        console.log(`✅ 3615 기록 ${c3615}건 차지연(졸업생)에게 복원 완료`);
    }

    // 4. 1404 강지훈, 1606 김준서 기록 원복 (2025년도 김민수, 김은결 기록임)
    const minsus = '36fc1fc4-5edb-4143-915e-1e91aacb5468'; // 김민수(2025)
    const jihoon = '8a97059a-f173-4d83-a5fe-125c32a24266'; // 강지훈(2026)

    const { count: c1404 } = await supabase.from('life_records').select('*', { count: 'exact', head: true }).eq('student_pid', jihoon);
    if (c1404 > 0) {
        await supabase.from('life_records').update({ student_pid: minsus }).eq('student_pid', jihoon);
        console.log(`✅ 1404 기록 ${c1404}건 김민수(2025)에게 복원 완료`);
    }

    const ungyel = 'eb172bf4-e4b5-400a-8bde-de91470f9c4d'; // 김은결(2025)
    const junseo = '15e301ee-4379-478d-ac22-4fa359daa2ad'; // 김준서(2026)

    const { count: c1606 } = await supabase.from('life_records').select('*', { count: 'exact', head: true }).eq('student_pid', junseo);
    if (c1606 > 0) {
        await supabase.from('life_records').update({ student_pid: ungyel }).eq('student_pid', junseo);
        console.log(`✅ 1606 기록 ${c1606}건 김은결(2025)에게 복원 완료`);
    }

    console.log("\n✨ 데이터 정정 완료!");
}

fixIssues();
