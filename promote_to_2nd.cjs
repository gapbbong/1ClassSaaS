const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function promote() {
    console.log("=== 2026학년도 2학년 진급 처리 시작 ===");

    const rawData = fs.readFileSync('2nd_grade_promotion_raw.txt', 'utf8');
    const lines = rawData.split('\n');

    // 1. 2025학년도 1학년 데이터 로딩
    const { data: students2025, error: err2025 } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2025)
        .like('class_info', '1-%');

    if (err2025) throw err2025;
    console.log(`2025학년도 1학년 데이터 ${students2025.length}명 조회 완료.`);

    const studentMap2025 = new Map();
    students2025.forEach(s => {
        const key = `${s.name.replace(/\s/g, '')}_${s.student_id}`;
        studentMap2025.set(key, s);
    });

    let successCount = 0;
    let failCount = 0;

    for (const line of lines) {
        if (!line.trim() || line.includes('학년\t학과\t반') || line.includes('특이사항')) continue;

        const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(p => p);
        if (parts.length < 8) continue;

        // 예: ["2학년", "IOT전기과", "1", "1", "고강민", "2009.08.07.", "남", "847.62", "1학년", "IOT전기과", "2", "1"]
        const newClass = parts[2];
        const newNum = parts[3].padStart(2, '0');
        const name = parts[4].replace(/\s/g, '');
        const birthDate = parts[5].replace(/\./g, '-').slice(0, 10);
        const gender = parts[6];

        const prevClass = parts[parts.length - 2];
        const prevNum = parts[parts.length - 1].padStart(2, '0');

        const prevStudentId = `1${prevClass}${prevNum}`;
        const newStudentId = `2${newClass}${newNum}`;

        const searchKey = `${name}_${prevStudentId}`;
        const prevData = studentMap2025.get(searchKey);

        if (!prevData) {
            console.warn(`[매칭 실패] ${name} (${prevStudentId}) 데이터를 찾을 수 없습니다.`);
            failCount++;
            continue;
        }

        const insertPayload = {
            student_id: newStudentId,
            name: name,
            academic_year: 2026,
            class_info: `2-${newClass}`,
            gender: gender,
            birth_date: birthDate,
            contact: prevData.contact,
            parent_contact: prevData.parent_contact,
            address: prevData.address,
            instagram_id: prevData.instagram_id,
            photo_url: prevData.photo_url,
            status: 'active'
        };

        const { error: insErr } = await supabase.from('students').insert([insertPayload]);

        if (insErr) {
            console.error(`[에러] ${name}(${newStudentId}):`, insErr.message);
            failCount++;
        } else {
            console.log(`[진급] ${name}: ${prevStudentId} -> ${newStudentId}`);
            successCount++;
        }
    }

    console.log(`\n=== 2학년 진급 결과 ===`);
    console.log(`성공: ${successCount}명`);
    console.log(`실패: ${failCount}명`);
    process.exit(0);
}

promote().catch(console.error);
