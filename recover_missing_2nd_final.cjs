const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const recoveryData = [
    { name: "김현우", student_id: "2106", class_info: "2-1", gender: "남", birth_date: "2009-03-18", photo_url: "https://drive.google.com/file/d/1E2o2iuDdzGgScRnkRHjRA7H3kFU0t2B3/view?usp=drivesdk" },
    { name: "김준혁", student_id: "2206", class_info: "2-2", gender: "남", birth_date: "2009-12-21", photo_url: "https://drive.google.com/file/d/1QRiJlCaMSB61p2XqVbzsJbhX5qEafmHY/view?usp=drivesdk" },
    { name: "김민재", student_id: "2501", class_info: "2-5", gender: "남", birth_date: "2009-10-06", photo_url: "https://drive.google.com/file/d/1Mn4grN8gwzYacarnODPeNTWFLwTdujqC/view?usp=drivesdk" },
    { name: "김재원", student_id: "2503", class_info: "2-5", gender: "남", birth_date: "2009-11-24", photo_url: "https://drive.google.com/file/d/1JBHWPtsZjGIHpRlYdmU7F2CzxN2r1qfa/view?usp=drivesdk" },
    { name: "김태윤", student_id: "2504", class_info: "2-5", gender: "남", birth_date: "2009-02-18", photo_url: "https://drive.google.com/file/d/1mENirxjMRg6oZC_S9Y-r-gQDwlpfvIBM/view?usp=drivesdk" },
    { name: "권수지", student_id: "2603", class_info: "2-6", gender: "여", birth_date: "2009-05-15", photo_url: null },
    { name: "안우진", student_id: "2411", class_info: "2-4", gender: "남", birth_date: "2009-10-30", photo_url: null }
];

async function recover() {
    console.log("=== 2학년 누락 학생 최종 복구 시작 ===");

    for (const item of recoveryData) {
        try {
            const payload = {
                ...item,
                academic_year: 2026,
                status: 'active'
            };

            // 기존에 잘못된 데이터가 있는지 확인 (학번 기준)
            const { data: ext } = await supabase.from('students')
                .select('pid')
                .eq('academic_year', 2026)
                .eq('student_id', item.student_id);

            if (ext && ext.length > 0) {
                const { error } = await supabase.from('students').update(payload).eq('pid', ext[0].pid);
                if (error) throw error;
                console.log(`✅ [수정 완료] ${item.name} (${item.student_id})`);
            } else {
                const { error } = await supabase.from('students').insert([payload]);
                if (error) throw error;
                console.log(`✅ [신규 등록] ${item.name} (${item.student_id})`);
            }
        } catch (e) {
            console.error(`❌ [에러] ${item.name}:`, e.message);
        }
    }

    console.log("=== 최종 복구 완료 ===");
    process.exit(0);
}

recover().catch(console.error);
