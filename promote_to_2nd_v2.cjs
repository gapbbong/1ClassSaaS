const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function promote() {
    console.log("=== 2026학년도 2학년 진급 처리 (보완 버전) 시작 ===");

    const rawData = fs.readFileSync('2nd_grade_promotion_raw.txt', 'utf8');
    const lines = rawData.split('\n');

    // 1. 2025학년도 1학년 전체 데이터 로딩 (매핑용)
    const { data: students2025, error: err2025 } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2025)
        .like('class_info', '1-%');

    if (err2025) throw err2025;
    console.log(`2025학년도 1학년 데이터 ${students2025.length}명 조회 완료.`);

    // 매핑 테이블 구성 (1. 이름+학번 조합, 2. 이름 유일성 보장 시 이름만)
    const idMap = new Map();
    const nameMap = new Map();

    students2025.forEach(s => {
        const cleanName = s.name.replace(/\s/g, '');
        idMap.set(`${cleanName}_${s.student_id}`, s);

        if (!nameMap.has(cleanName)) {
            nameMap.set(cleanName, []);
        }
        nameMap.get(cleanName).push(s);
    });

    let successCount = 0;
    let failCount = 0;
    let retryCount = 0;

    for (const line of lines) {
        if (!line.trim() || line.includes('학년\t학과\t반') || line.includes('특이사항')) continue;

        const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(p => p);
        if (parts.length < 8) continue;

        const newClass = parts[2];
        const newNum = parts[3].padStart(2, '0');
        const name = parts[4].replace(/\s/g, '');
        const birthDate = parts[5].replace(/\./g, '-').slice(0, 10);
        const gender = parts[6];

        const prevClass = parts[parts.length - 2];
        const prevNum = parts[parts.length - 1].padStart(2, '0');

        const prevStudentId = `1${prevClass}${prevNum}`;
        const newStudentId = `2${newClass}${newNum}`;

        let targetData = idMap.get(`${name}_${prevStudentId}`);

        // 1차 매핑 실패 시 이름으로만 검색 시도 (동명이인 주의)
        if (!targetData) {
            const sameNameStudents = nameMap.get(name) || [];
            if (sameNameStudents.length === 1) {
                targetData = sameNameStudents[0];
                console.log(`[매칭 보완] ${name}: 학번 불일치(${prevStudentId} vs ${targetData.student_id})였으나 이름으로 매칭 성공.`);
                retryCount++;
            } else if (sameNameStudents.length > 1) {
                console.warn(`[매칭 불가] ${name}: 동명이인이 존재하여 자동 매칭을 건너뜁니다.`);
                failCount++;
                continue;
            } else {
                console.warn(`[매칭 실패] ${name}: DB에 해당 이름의 1학년 학생이 없습니다.`);
                failCount++;
                continue;
            }
        }

        const insertPayload = {
            student_id: newStudentId,
            name: name,
            academic_year: 2026,
            class_info: `2-${newClass}`,
            gender: gender,
            birth_date: birthDate,
            contact: targetData.contact,
            parent_contact: targetData.parent_contact,
            address: targetData.address,
            instagram_id: targetData.instagram_id,
            photo_url: targetData.photo_url,
            status: 'active'
        };

        // 중복 삽입 방지 (업서트)
        const { data: ext } = await supabase.from('students')
            .select('pid')
            .eq('academic_year', 2026)
            .eq('student_id', newStudentId);

        let dbErr;
        if (ext && ext.length > 0) {
            const { error } = await supabase.from('students').update(insertPayload).eq('pid', ext[0].pid);
            dbErr = error;
        } else {
            const { error } = await supabase.from('students').insert([insertPayload]);
            dbErr = error;
        }

        if (dbErr) {
            console.error(`[에러] ${name}(${newStudentId}):`, dbErr.message);
            failCount++;
        } else {
            successCount++;
        }
    }

    console.log(`\n=== 2학년 진급 보완 결과 ===`);
    console.log(`총 성공: ${successCount}명 (보완 매핑: ${retryCount}명)`);
    console.log(`매칭 실패/중복 실패: ${failCount}명`);
    process.exit(0);
}

promote().catch(console.error);
