import { readFileSync, writeFileSync } from 'fs';
let content = readFileSync('d:/App/1cl/src/js/api.js', 'utf8');
content = content.replace(/2025/g, '2026');
writeFileSync('d:/App/1cl/src/js/api.js', content);
console.log('API Year fixed');
