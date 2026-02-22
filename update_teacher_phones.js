import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.map(line => {
        const cols = [];
        let cur = '';
        let inQuote = false;
        for (const ch of line) {
            if (ch === '"') { inQuote = !inQuote; }
            else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
            else { cur += ch; }
        }
        cols.push(cur.trim());
        return cols;
    });
}

(async () => {
    console.log("🔄 교사 연락처 및 부담임 정보 업데이트를 시작합니다...");
    const csvPath = path.join(__dirname, 'Teachers.csv');
    const fileBuffer = fs.readFileSync(csvPath);
    const fileContent = iconv.decode(fileBuffer, 'euc-kr');
    let dataRows = parseCSV(fileContent);

    // 헤더 제거
    dataRows.shift();

    let updateCount = 0;

    for (const r of dataRows) {
        if (r.length < 2) continue;
        const email = r[0]?.trim();
        const hrPhone = r[4]?.trim() || null;
        const subGrade = r[5]?.trim() || null;
        const subClass = r[6]?.trim() || null;
        const subPhone = r[7]?.trim() || null;

        // 전화번호는 담임 번호가 우선, 없으면 부담임 번호
        const phone = hrPhone || subPhone;

        const { error } = await supabase
            .from('teachers')
            .update({
                phone: phone,
                sub_grade: subGrade,
                sub_class: subClass
            })
            .eq('email', email);

        if (error) {
            console.log(`❌ DB 업데이트 에러 (${email}): ${error.message}`);
        } else {
            updateCount++;
        }
    }

    console.log(`🎉 연락처 및 부담임 정보 업데이트 완료! (총 ${updateCount}건 갱신)`);
})();
