import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
    console.log("🧐 최종 검증 진행...");

    // 1. 배지민 내용 확인
    const { data: baji } = await supabase.from('students').select('pid').eq('name', '배지민').eq('academic_year', 2026).single();
    if (baji) {
        const { data: records } = await supabase.from('life_records').select('content').eq('student_pid', baji.pid);
        console.log(`- 배지민 기록 내용 길이: ${records[0]?.content.length || 0}`);
    }

    // 2. 1404, 1606 기록 소유자 확인
    const jihoon = '8a97059a-f173-4d83-a5fe-125c32a24266'; // 강지훈(2026)
    const junseo = '15e301ee-4379-478d-ac22-4fa359daa2ad'; // 김준서(2026)

    const { count: c1 } = await supabase.from('life_records').select('*', { count: 'exact', head: true }).eq('student_pid', jihoon);
    const { count: c2 } = await supabase.from('life_records').select('*', { count: 'exact', head: true }).eq('student_pid', junseo);

    console.log(`- 2026 강지훈(1404) 기록 수: ${c1}`);
    console.log(`- 2026 김준서(1606) 기록 수: ${c2}`);

    // 3. 사진 확인 (이름으로)
    const names = ["김우진", "HAN PANG WEN"];
    const { data: photos } = await supabase.from('students').select('name, photo_url').in('name', names).eq('academic_year', 2026);
    photos.forEach(p => {
        console.log(`- ${p.name} 사진: ${p.photo_url ? '있음' : '없음'}`);
    });
}

verify();
