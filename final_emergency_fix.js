import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function finalFix() {
    console.log("🚀 최종 데이터 정정 및 복구 시작...");

    // 1. 2410 배지민 내용 복출
    const { data: s2410 } = await supabase.from('students').select('pid').eq('student_id', '2410').eq('academic_year', 2026).single();
    if (s2410) {
        const fullContent = "복도에서 담임샘 지도를 받고 있는 상태\n1. 사온 닭강정을 먹으며 불만 가득한 상태\n2. 대화 후 교실에 들어가 책상을 엎고 교실 리모컨을 던져 완전 파손시킴";
        await supabase.from('life_records')
            .update({ content: fullContent })
            .eq('student_pid', s2410.pid)
            .ilike('content', '복도에서 담임샘 지도를%');
        console.log("✅ 2410 배지민 생활기록 내용 복구 완료");
    }

    // 2. 1404, 1606 기록 이전 (재검색 및 강제 이전)
    // 2025년도 소유자 PID
    const minsus = '36fc1fc4-5edb-4143-915e-1e91aacb5468'; // 김민수(2025)
    const ungyel = 'eb172bf4-e4b5-400a-8bde-de91470f9c4d'; // 김은결(2025)

    // 2026년도 신규 소유자 PID
    const jihoon = '8a97059a-f173-4d83-a5fe-125c32a24266'; // 강지훈(2026)
    const junseo = '15e301ee-4379-478d-ac22-4fa359daa2ad'; // 김준서(2026)

    const { count: c1 } = await supabase.from('life_records').select('*', { count: 'exact', head: true }).eq('student_pid', jihoon);
    if (c1 > 0) {
        await supabase.from('life_records').update({ student_pid: minsus }).eq('student_pid', jihoon);
        console.log(`✅ 1404 기록 ${c1}건 김민수(2025)에게 이전 완료`);
    }

    const { count: c2 } = await supabase.from('life_records').select('*', { count: 'exact', head: true }).eq('student_pid', junseo);
    if (c2 > 0) {
        await supabase.from('life_records').update({ student_pid: ungyel }).eq('student_pid', junseo);
        console.log(`✅ 1606 기록 ${c2}건 김은결(2025)에게 이전 완료`);
    }

    // 3. 중복 학번 정리 (2411, 3301)
    // 2411 김우진 vs 안우진 -> 이름 확인하여 안우진이 중복이면 삭제 또는 학번 수정
    // 3301 HAN PANG WEN vs HANPANGWEN -> 하나로 통합

    // 3301 통합
    const { data: hanClean } = await supabase.from('students').select('*').eq('name', 'HANPANGWEN').single();
    if (hanClean) {
        await supabase.from('students').delete().eq('pid', hanClean.pid);
        console.log("✅ 3301 HANPANGWEN 중복 제거 완료");
    }

    // 2411 안우진 학번 확인. 만약 안우진이 실제 2411이 아니라면? 
    // 안우진의 사진 URL을 김우진에게 주고 안우진은 학번을 임시로 9999로 변경하거나 삭제 
    // (사용자가 김우진 사진이 안나온다고 한 것으로 보아 김우진이 실제 학생임)
    const { data: an } = await supabase.from('students').select('*').eq('name', '안우진').eq('student_id', '2411').single();
    if (an) {
        await supabase.from('students').delete().eq('pid', an.pid);
        console.log("✅ 2411 안우진 중복 제거 완료");
    }

    console.log("\n✨ 모든 정정 작업 완료!");
}

finalFix();
