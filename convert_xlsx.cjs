const XLSX = require('xlsx');
const fs = require('fs');

function toCsv(xlsxPath, csvPath) {
    try {
        const workbook = XLSX.readFile(xlsxPath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        fs.writeFileSync(csvPath, csv);
        console.log(`✅ ${xlsxPath} -> ${csvPath} 변환 완료`);
    } catch (e) {
        console.error(`❌ ${xlsxPath} 변환 실패:`, e.message);
    }
}

toCsv('iot.xlsx', 'iot.csv');
toCsv('game.xlsx', 'game.csv');
