import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseCSVLine(str) {
    const regex = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\s\S][^'\\]*)*)'|"([^"\\]*(?:\\[\s\S][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    let match;
    const arr = [];
    while (match = regex.exec(str)) {
        if (match[1]) arr.push(match[1]);
        else if (match[2]) arr.push(match[2]);
        else if (match[3]) arr.push(match[3]);
        else arr.push('');
    }
    // Simple fallback if regex missed empties
    return str.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').trim());
}

async function run() {
    const csvData = fs.readFileSync('temp_3_4.csv', 'utf8');
    const lines = csvData.split(/\r?\n/).filter(x => x.trim().length > 0);
    const header = parseCSVLine(lines[0]);

    function getCol(rowStr, headerName) {
        const row = parseCSVLine(rowStr);
        const idx = header.indexOf(headerName);
        return idx !== -1 ? (row[idx] || '') : '';
    }

    const targetStudents = [];
    for (let i = 1; i < lines.length; i++) {
        const rowStr = lines[i];
        const grade = getCol(rowStr, '학년');
        const classNum = getCol(rowStr, '반');
        const sid = getCol(rowStr, '학번');
        const num = parseInt(sid.slice(-2), 10);

        if (grade === '3' && classNum === '4' && num >= 1 && num <= 17) {
            targetStudents.push(rowStr);
        }
    }

    console.log(`기초 데이터(1~17번) ${targetStudents.length}명 추출. 복구 시작...`);

    let cnt = 0;
    for (const rowStr of targetStudents) {
        const st_id = getCol(rowStr, '학번');
        const st_name = getCol(rowStr, '이름');
        const st_gender = getCol(rowStr, '성별');
        const st_contact = getCol(rowStr, '학생폰');
        const st_address = getCol(rowStr, '집주소');
        const st_instagram = getCol(rowStr, '인스타 id');

        let pCnt = getCol(rowStr, '모(연락처)');
        if (!pCnt) pCnt = getCol(rowStr, '부(연락처)');

        let photoUrl = `https://pwyflwjtafarkwbejoen.supabase.co/storage/v1/object/public/student-photos/2025/${st_id}.jpg`;
        // fallback to 구글링크 for tests, but we will use supabase
        let st_drive = getCol(rowStr, '사진저장링크');
        if (!st_drive) st_drive = photoUrl;

        // DB에 중복체크 또는 단순 upsert
        const insertPayload = {
            student_id: st_id,
            name: st_name,
            academic_year: 2025,
            class_info: '3-4',
            gender: st_gender,
            contact: st_contact,
            parent_contact: pCnt,
            address: st_address,
            instagram_id: st_instagram,
            status: 'active',
            photo_url: photoUrl
        };

        const { data: ext, error: qErr } = await supabase.from('students')
            .select('pid')
            .eq('academic_year', 2025)
            .eq('student_id', st_id);

        if (qErr) {
            console.error(st_id, st_name, "조회 에러:", qErr.message);
            continue;
        }

        let dbErr;
        if (ext && ext.length > 0) {
            const { error } = await supabase.from('students')
                .update(insertPayload)
                .eq('pid', ext[0].pid);
            dbErr = error;
        } else {
            const { error } = await supabase.from('students')
                .insert([insertPayload]);
            dbErr = error;
        }

        if (dbErr) {
            console.error(st_id, st_name, "에러:", dbErr.message);
        } else {
            console.log(st_id, st_name, "복원 완료! (2025학년도 3-4)");
            cnt++;
        }
    }
    console.log(`총 ${cnt}명 완료!`);
}

run();
