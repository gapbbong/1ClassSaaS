
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
