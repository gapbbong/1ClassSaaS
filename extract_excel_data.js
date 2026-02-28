import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { execSync } from 'child_process';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// xlsx 라이브러리 설치 체크 또는 npx 사용
// 여기서는 npx를 사용하여 추출하는 방식을 시도하거나, 
// 직접 xlsx 모듈을 활용하는 스크립트를 작성하여 npx로 실행합니다.

const compareScript = `
const XLSX = require('xlsx');
const fs = require('fs');

function extractData(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // JSON으로 변환 (헤더 포함)
    return XLSX.utils.sheet_to_json(worksheet);
}

const iotData = extractData('2026학년도_2학년_IoT전기과 명렬.xlsx');
const gameData = extractData('2026학년도_2학년_게임콘텐츠과 명렬.xlsx');

fs.writeFileSync('excel_data.json', JSON.stringify({ iotData, gameData }, null, 2));
console.log('✅ 엑셀 데이터 추출 완료: excel_data.json');
`;

(async () => {
    try {
        console.log("📦 엑셀 파일에서 데이터 추출 시도 중...");
        fs.writeFileSync('temp_extract.cjs', compareScript);

        // npx를 사용하여 xlsx가 포함된 환경에서 실행
        execSync('npx -y xlsx temp_extract.cjs', { stdio: 'inherit' });

        const excelData = JSON.parse(fs.readFileSync('excel_data.json', 'utf8'));
        console.log(`📊 IoT전기과: ${excelData.iotData.length}명, 게임콘텐츠과: ${excelData.gameData.length}명 추출됨.`);

        // DB 데이터와 비교 로직 추가 예정
    } catch (err) {
        console.error("❌ 엑셀 분석 실패:", err.message);
    }
})();
