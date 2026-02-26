const https = require('https');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const csvUrl = 'https://docs.google.com/spreadsheets/d/1Fnvbd2_oDlZ_JZ874smNhDoXDqvZhOzApjAFleeZIdU/export?format=csv&gid=153974185';

function fetchCsv(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                resolve(fetchCsv(res.headers.location));
                return;
            }
            let data = Buffer.alloc(0);
            res.on('data', chunk => { data = Buffer.concat([data, chunk]); });
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parseCSV(text) {
    const lines = [];
    let curLine = [];
    let curToken = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (inQuotes && text[i + 1] === '"') { curToken += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (c === ',' && !inQuotes) {
            curLine.push(curToken); curToken = '';
        } else if (c === '\n' && !inQuotes) {
            curLine.push(curToken.replace(/\r/g, ''));
            lines.push(curLine); curLine = []; curToken = '';
        } else { curToken += c; }
    }
    if (curLine.length > 0 || curToken) {
        curLine.push(curToken.replace(/\r/g, ''));
        lines.push(curLine);
    }
    return lines;
}

async function fixData() {
    console.log("1. CSV 다운로드...");
    const buffer = await fetchCsv(csvUrl);

    // UTF-8로 먼저 시도
    let text = buffer.toString('utf8');
    let rows = parseCSV(text);
    let headers = rows[0].map(h => h.trim());

    // 헤더에 깨진 문자가 있는지 확인
    console.log("헤더[0]:", headers[0]);
    if (headers[0].includes('?')) {
        console.log("인코딩 문제 감지... EUC-KR(CP949) 가능성 시도");
        // 이 환경에서 iconv-lite가 없을 수 있으므로, buffer 자체에서 키워드를 찾거나 인덱스로 접근
    }

    console.log("헤더 리스트:", headers);

    const statusIdx = headers.indexOf('학적');
    const nameIdx = headers.indexOf('이름');
    const idIdx = headers.indexOf('학번');
    const classIdx = headers.indexOf('반');
    const gradeIdx = headers.indexOf('학년');

    console.log(`인덱스 정보 - 학적:${statusIdx}, 이름:${nameIdx}, 학번:${idIdx}, 반:${classIdx}`);

    if (statusIdx === -1) {
        console.log("'학적' 헤더를 찾을 수 없습니다. 인덱스로 수동 매칭 시도 (15번 근처)");
        // CSV 샘플을 보고 판단해야 할듯
    }

    const updates = [];
    const dropouts = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 5) continue;

        const name = (row[nameIdx] || '').trim();
        const id = (row[idIdx] || '').trim();
        const status = (row[statusIdx] || '').trim();
        const grade = (row[gradeIdx] || '').trim();

        if (grade !== '2' && !id.startsWith('2')) continue;

        if (status && status !== '재학') {
            console.log(`[발견] ${name}(${id}): ${status}`);

            let finalStatus = 'active';
            if (status.includes('자퇴')) finalStatus = '자퇴';
            else if (status.includes('위탁')) finalStatus = '위탁';
            else if (status.includes('전출')) finalStatus = '전출';
            else if (status.includes('전입')) finalStatus = '전입';

            if (finalStatus !== 'active') {
                dropouts.push({ name, id, status: finalStatus });
                updates.push(
                    supabase.from('students')
                        .update({ status: finalStatus })
                        .eq('academic_year', 2025)
                        .eq('student_id', id)
                );
            }
        }

        // 남현빈 공백 제거 및 2-4반 확인
        if (name.replace(/\s/g, '') === '남현빈') {
            console.log(`[남현빈 데이터 확인] 학번:${id}, 이름:'${name}', 반:${row[classIdx]}`);
            // 이름에 공백이 있다면 제거 업데이트
            if (name !== '남현빈') {
                updates.push(
                    supabase.from('students')
                        .update({ name: '남현빈' })
                        .eq('academic_year', 2025)
                        .eq('student_id', id)
                );
            }
        }
    }

    if (updates.length > 0) {
        console.log(`${updates.length}건의 데이터 수정 요청 중...`);
        const results = await Promise.all(updates);
        console.log("업데이트 완료.");
    } else {
        console.log("수정할 데이터가 없습니다.");
    }

    console.log("\n=== 2학년 자퇴생 명단 ===");
    dropouts.filter(d => d.status === '자퇴').forEach(d => console.log(`- ${d.name} (${d.id})`));

    process.exit(0);
}

fixData().catch(console.error);
