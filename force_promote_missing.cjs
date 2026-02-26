const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const manualPromotion = [
    { name: "김현우", oldId: "1207", newId: "2106", newClass: "2-1" },
    { name: "김준혁", oldId: "1306", newId: "2206", newClass: "2-2" },
    { name: "안우진", oldId: "1408", newId: "2411", newClass: "2-4" },
    { name: "김민재", oldId: "1506", newId: "2501", newClass: "2-5" },
    { name: "김재원", oldId: "1508", newId: "2503", newClass: "2-5" },
    { name: "김태윤", oldId: "1509", newId: "2504", newClass: "2-5" },
    { name: "권수지", oldId: "1521", newId: "2603", newClass: "2-6" }
];

async function forcePromote() {
    console.log("=== 누락 학생 강제 진급 처리 시작 ===");

    for (const item of manualPromotion) {
        try {
            // 1. 2025학년도 데이터 찾기 (학번 우선, 이름 보조)
            let { data: prev, error: fErr } = await supabase
                .from('students')
                .select('*')
                .eq('name', item.name)
                .eq('academic_year', 2025)
                .limit(1);

            if (!prev || prev.length === 0) {
                console.warn(`⚠️ [실패] ${item.name}: 2025학년도 데이터를 찾을 수 없습니다.`);
                continue;
            }

            const prevData = prev[0];
            const insertPayload = {
                student_id: item.newId,
                name: item.name,
                academic_year: 2026,
                class_info: item.newClass,
                gender: prevData.gender,
                birth_date: prevData.birth_date,
                contact: prevData.contact,
                parent_contact: prevData.parent_contact,
                address: prevData.address,
                instagram_id: prevData.instagram_id,
                photo_url: prevData.photo_url,
                status: 'active'
            };

            // 2. 2026학년도에 이미 있는지 확인
            const { data: ext } = await supabase.from('students')
                .select('pid')
                .eq('academic_year', 2026)
                .eq('student_id', item.newId);

            if (ext && ext.length > 0) {
                const { error } = await supabase.from('students').update(insertPayload).eq('pid', ext[0].pid);
                if (error) throw error;
                console.log(`✅ [업데이트] ${item.name}: ${item.newId} (${item.newClass})`);
            } else {
                const { error } = await supabase.from('students').insert([insertPayload]);
                if (error) throw error;
                console.log(`✅ [신규진급] ${item.name}: ${item.newId} (${item.newClass})`);
            }
        } catch (e) {
            console.error(`❌ [에러] ${item.name}:`, e.message);
        }
    }

    console.log("=== 강제 진급 처리 완료 ===");
    process.exit(0);
}

forcePromote().catch(console.error);
