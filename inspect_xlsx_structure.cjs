const XLSX = require('xlsx');
const fs = require('fs');

function inspectExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`\n--- [파일: ${filePath}] ---`);
    console.log(`Sheet Name: ${sheetName}`);
    if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample Data (First 3):', data.slice(0, 3));
    } else {
        console.log('Empty sheet or no data found.');
    }
}

inspectExcel('2026학년도_2학년_IoT전기과 명렬.xlsx');
inspectExcel('2026학년도_2학년_게임콘텐츠과 명렬.xlsx');
