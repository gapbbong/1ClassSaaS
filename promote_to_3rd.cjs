const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function promote() {
    console.log("=== 2026학년도 3학년 진급 처리 시작 ===");

    const rawData = fs.readFileSync('3rd_grade_promotion_raw.txt', 'utf8');
    const lines = rawData.split('\n');

    // 1. 2025학년도 2학년 전수 데이터를 미리 로딩 (이름 + 이전 학급 정보 매칭용)
    const { data: students2025, error: err2025 } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2025)
        .like('class_info', '2-%');

    if (err2025) throw err2025;
    console.log(`2025학년도 2학년 데이터 ${students2025.length}명 로딩 완료.`);

    const studentMap2025 = new Map();
    students2025.forEach(s => {
        // 키: "이름_학번" (학번은 2420 같은 형태)
        const key = `${s.name.replace(/\s/g, '')}_${s.student_id}`;
        studentMap2025.set(key, s);
    });

    let successCount = 0;
    let failCount = 0;

    for (const line of lines) {
        if (!line.trim() || line.includes('학년\t학과\t반') || line.includes('2026학년도')) continue;

        // 탭 또는 공백으로 분리
        const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(p => p);
        if (parts.length < 8) continue;

        // 명단 구조: [3학년, 학과, 반, 번호, 성명, 생년월일, 성별, 기준성적, 2학년, 학과, 이전반, 이전번호]
        // 예: ["3학년", "IOT전기과", "1", "1", "김현수", "2008.09.17.", "남", "618.40", "2학년", "IOT전기과", "1", "1"]

        const newClass = parts[2];
        const newNum = parts[3].padStart(2, '0');
        const name = parts[4].replace(/\s/g, '');
        const birthDate = parts[5].replace(/\./g, '-').slice(0, 10);
        const gender = parts[6];

        // 이전 학기 정보 찾기 (뒤에서부터 찾는게 안전)
        const prevClass = parts[parts.length - 2];
        const prevNum = parts[parts.length - 1].padStart(2, '0');

        const prevStudentId = `2${prevClass}${prevNum}`;
        const newStudentId = `3${newClass}${newNum}`;

        const searchKey = `${name}_${prevStudentId}`;
        const prevData = studentMap2025.get(searchKey);

        if (!prevData) {
            console.warn(`[매칭 실패] ${name} (이전 학번: ${prevStudentId}) 데이터를 찾을 수 없습니다.`);
            failCount++;
            continue;
        }

        // 새 레코드 생성 (사진, 연락처, 주소 등 계승)
        const insertPayload = {
            student_id: newStudentId,
            name: name,
            academic_year: 2026,
            class_info: `3-${newClass}`,
            gender: gender,
            birth_date: birthDate,
            contact: prevData.contact,
            parent_contact: prevData.parent_contact,
            address: prevData.address,
            instagram_id: prevData.instagram_id,
            photo_url: prevData.photo_url,
            status: 'active' // 진급 시 기본은 재학
        };

        const { error: insErr } = await supabase.from('students').insert([insertPayload]);

        if (insErr) {
            console.error(`[삽입 에러] ${name}(${newStudentId}):`, insErr.message);
            failCount++;
        } else {
            console.log(`[진급 성공] ${name}: ${prevStudentId} -> ${newStudentId}`);
            successCount++;
        }
    }

    console.log(`\n=== 진급 처리 결과 ===`);
    console.log(`성공: ${successCount}명`);
    console.log(`실패: ${failCount}명`);
    process.exit(0);
}

promote().catch(console.error);
