/**
 * GitHub Actions CI 환경용 백업 스크립트 (환경변수로 키 주입)
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ 환경변수 SUPABASE_URL / SUPABASE_KEY 가 설정되지 않았습니다.');
    process.exit(1);
}

const TABLES = [
    { name: 'students',     select: '*' },
    { name: 'surveys',      select: '*' },
    { name: 'life_records', select: '*' },
    { name: 'teachers',     select: 'id, email, name, role, assigned_class, created_at' },
];

const KEEP_DAYS = 30;

async function fetchAll(supabase, table, select) {
    let rows = [];
    let from = 0;
    const CHUNK = 1000;
    while (true) {
        const { data, error } = await supabase.from(table).select(select).range(from, from + CHUNK - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        rows = rows.concat(data);
        if (data.length < CHUNK) break;
        from += CHUNK;
    }
    return rows;
}

function getDateStr() {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
}

function cleanOldBackups(backupRoot) {
    if (!fs.existsSync(backupRoot)) return;
    const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
    fs.readdirSync(backupRoot).forEach(dir => {
        const fullPath = path.join(backupRoot, dir);
        try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && stat.mtimeMs < cutoff) {
                fs.rmSync(fullPath, { recursive: true });
                console.log(`🗑️  오래된 백업 삭제: ${dir}`);
            }
        } catch (e) {}
    });
}

async function main() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const dateStr = getDateStr();
    const backupRoot = path.join(__dirname, 'backups');
    const backupDir = path.join(backupRoot, dateStr);
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    console.log(`📦 DB 백업 시작 (${dateStr} KST)`);
    let total = 0;
    for (const { name, select } of TABLES) {
        const rows = await fetchAll(supabase, name, select);
        fs.writeFileSync(path.join(backupDir, `${name}.json`), JSON.stringify(rows, null, 2));
        console.log(`  ✅ ${name}: ${rows.length}건`);
        total += rows.length;
    }
    fs.writeFileSync(path.join(backupDir, '_meta.json'), JSON.stringify({ date: dateStr, total, tables: TABLES.map(t => t.name) }, null, 2));
    console.log(`✅ 완료: 총 ${total}건 → backups/${dateStr}/`);
    cleanOldBackups(backupRoot);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
