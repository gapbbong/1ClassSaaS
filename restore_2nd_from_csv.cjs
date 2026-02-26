const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// 구글 스프레드시트 CSV 내보내기 링크 (25학년도 학생 명단 시트)
const csvUrl = 'https://docs.google.com/spreadsheets/d/1Fnvbd2_oDlZ_JZ874smNhDoXDqvZhOzApjAFleeZIdU/export?format=csv&gid=153974185';

function fetchCsv(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            // 리다이렉트 처리 (구글 시트는 307 등의 임시 리다이렉트 발생 가능)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                resolve(fetchCsv(res.headers.location));
                return;
            }
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
    });
}

function parseCSV(text) {
    // 엑셀/구글시트 CSV의 간단 파서 (따옴표 호환)
    const lines = [];
    let curLine = [];
    let curToken = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (inQuotes && text[i + 1] === '"') {
                curToken += '"';
                i++; // 이스케이프된 따옴표
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            curLine.push(curToken);
            curToken = '';
        } else if (c === '\n' && !inQuotes) {
            curLine.push(curToken.replace(/\r/g, ''));
            lines.push(curLine);
            curLine = [];
            curToken = '';
        } else {
            curToken += c;
        }
    }
    if (curLine.length > 0 || curToken) {
        curLine.push(curToken.replace(/\r/g, ''));
        lines.push(curLine);
    }
    return lines;
}

async function run() {
    console.log("구글 시트에서 학생 명단 CSV 다운로드 중...");
    const csvData = await fetchCsv(csvUrl);
    const rows = parseCSV(csvData);

    if (rows.length < 2) {
        console.error("CSV 데이터가 없거나 1줄뿐입니다.");
        return;
    }

    const headers = rows[0].map(h => h.trim());
    console.log("헤더 리스트:", headers);

    const getCol = (rowArr, colName) => {
        const idx = headers.indexOf(colName);
        if (idx === -1) return '';
        return (rowArr[idx] || '').trim();
    };

    let cnt = 0;

    for (let i = 1; i < rows.length; i++) {
        const rowStr = rows[i];
        if (!rowStr || rowStr.length < 2) continue;

        const st_grade = getCol(rowStr, '학년');
        const st_class_raw = getCol(rowStr, '반');
        let st_id = getCol(rowStr, '학번');
        const st_name = getCol(rowStr, '이름');

        // 2학년인 학생만 복구 대상
        let isSecondGrade = false;
        if (st_grade === '2') {
            isSecondGrade = true;
        } else if (!st_grade && st_id && String(st_id).startsWith('2') && String(st_id).length === 4) {
            isSecondGrade = true;
        }

        if (!isSecondGrade || !st_name) continue;

        // 남현빈 학생 예외 처리: 2503 -> 2420 이동
        if (st_id === '2503' && st_name === '남현빈') {
            console.log("남현빈 학생 반 이동 처리: 2503 -> 2420 (2학년 4반)");
            st_id = '2420';
        }

        const st_gender = getCol(rowStr, '성별') || '미지정';
        let st_contact = getCol(rowStr, '학생폰');
        const st_address = getCol(rowStr, '집주소');
        const st_instagram = getCol(rowStr, '인스타 id');
        let st_status_raw = getCol(rowStr, '학적');

        let pCnt = getCol(rowStr, '모(연락처)');
        if (!pCnt) pCnt = getCol(rowStr, '부(연락처)');

        const class_info = `2-${st_class_raw ? st_class_raw : st_id.charAt(1)}`;

        // 학적 상태 매핑
        let finalStatus = 'active';
        if (st_status_raw) {
            if (st_status_raw.includes('자퇴')) finalStatus = '자퇴';
            else if (st_status_raw.includes('위탁')) finalStatus = '위탁';
            else if (st_status_raw.includes('전출')) finalStatus = '전출';
            else if (st_status_raw.includes('전입')) finalStatus = '전입';
            else if (st_status_raw.includes('졸업')) finalStatus = 'graduated';
        }

        // 사진 경로 설정 (S3/Supabase Storage)
        let photoUrl = `https://pwyflwjtafarkwbejoen.supabase.co/storage/v1/object/public/student-photos/2025/${st_id}.jpg`;

        const insertPayload = {
            student_id: st_id,
            name: st_name,
            academic_year: 2025,
            class_info: class_info,
            gender: st_gender,
            contact: st_contact,
            parent_contact: pCnt,
            address: st_address,
            instagram_id: st_instagram,
            status: finalStatus,
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
            console.log(`${st_id} ${st_name} 업데이트! (${finalStatus})`);
        } else {
            const { error } = await supabase.from('students')
                .insert([insertPayload]);
            dbErr = error;
            console.log(`${st_id} ${st_name} 신규 추가! (${finalStatus})`);
        }

        if (dbErr) {
            console.error(st_id, st_name, "에러:", dbErr.message);
        } else {
            cnt++;
        }
    }
    console.log(`구글 시트를 기반으로 2025학년도 2학년 총 ${cnt}명의 업데이트/복원 완료!`);
}

run();
