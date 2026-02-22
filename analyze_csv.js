import fs from 'fs';
import iconv from 'iconv-lite';

const csvPath = 'Teachers.csv';
const fileBuffer = fs.readFileSync(csvPath);
const fileContent = iconv.decode(fileBuffer, 'euc-kr');
const lines = fileContent.split('\n').filter(l => l.trim());

console.log("CSV Header:", lines[0]);
console.log("\nFirst 10 Rows:");
lines.slice(1, 11).forEach((line, i) => {
    console.log(`${i + 1}: ${line}`);
});

console.log("\n--- Searching for Jang Hyo-yoon ---");
const jang = lines.find(l => l.includes("장효윤"));
console.log(jang ? `Found line: ${jang}` : "Jang Hyo-yoon not found in CSV.");

console.log("\n--- Searching for Lee Gap-jong ---");
const lee = lines.find(l => l.includes("이갑종"));
console.log(lee ? `Found line: ${lee}` : "Lee Gap-jong not found in CSV.");

console.log("\n--- Searching for Jung Go-eun ---");
const jung = lines.find(l => l.includes("정고은"));
console.log(jung ? `Found line: ${jung}` : "Jung Go-eun not found in CSV.");
