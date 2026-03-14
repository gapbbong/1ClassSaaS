/**
 * OneClass25 DB 복구 스크립트
 * 사용법: node restore_db.js [백업날짜]
 * 예시:   node restore_db.js 2026-03-14
 *
 * ⚠️  UPSERT 방식으로 복구: 있으면 업데이트, 없으면 삽입
 * ⚠️  기존 데이터를 먼저 삭제하지 않으므로 안전합니다.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://pwyflwjtafarkwbejoen.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3eWZsd2p0YWZhcmt3YmVqb2VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYzNTIzMSwiZXhwIjoyMDg3MjExMjMxfQ.DWtKZHpkM9D-mR26mG1ncrVHi2vxIre3l7-9bH4IVEE';

// 테이블별 고유키 설정 (upsert를 위한 PK)
const TABLES = [
    { name: 'students',     pk: 'pid' },
    { name: 'surveys',      pk: 'id' },
    { name: 'life_records', pk: 'id' },
    { name: 'teachers',     pk: 'id' },
];

async function upsertChunked(supabase, table, rows, pk, chunkSize = 100) {
    let count = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from(table).upsert(chunk, { onConflict: pk });
        if (error) throw new Error(`${table} 복구 오류: ${error.message}`);
        count += chunk.length;
        process.stdout.write(`\r  ⏳ ${table}: ${count}/${rows.length}건 복구 중...`);
    }
    console.log(`\r  ✅ ${table}: ${rows.length}건 복구 완료`);
}

async function main() {
    const targetDate = process.argv[2];
    if (!targetDate) {
        // 날짜 미입력 시 최신 백업 자동 선택
        const backupRoot = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupRoot)) {
            console.error('❌ backups 폴더가 없습니다. 먼저 백업을 실행하세요.');
            process.exit(1);
        }
        const dirs = fs.readdirSync(backupRoot).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
        if (dirs.length === 0) {
            console.error('❌ 백업 파일이 없습니다.');
            process.exit(1);
        }
        const latest = dirs[dirs.length - 1];
        console.log(`📅 날짜 미입력 → 최신 백업 사용: ${latest}`);
        process.argv[2] = latest;
        return main();
    }

    const backupDir = path.join(__dirname, 'backups', targetDate);
    if (!fs.existsSync(backupDir)) {
        console.error(`❌ 백업 폴더가 없습니다: ${backupDir}`);
        process.exit(1);
    }

    console.log(`\n🔄 DB 복구 시작 (백업: ${targetDate})`);
    console.log('⚠️  UPSERT 방식: 기존 데이터 삭제 없이 덮어쓰기\n');

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    for (const { name, pk } of TABLES) {
        const filePath = path.join(backupDir, `${name}.json`);
        if (!fs.existsSync(filePath)) {
            console.warn(`  ⚠️  ${name}.json 파일 없음 — 건너뜀`);
            continue;
        }
        const rows = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (rows.length === 0) { console.log(`  ⏭️  ${name}: 데이터 없음`); continue; }
        await upsertChunked(supabase, name, rows, pk);
    }

    console.log('\n✅ 복구 완료!\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
