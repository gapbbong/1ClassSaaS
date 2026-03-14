/**
 * OneClass25 Supabase DB 자동 백업 스크립트
 * - 실행 시 날짜별 폴더 생성 후 주요 테이블을 JSON으로 저장
 * - Windows 작업 스케줄러로 매일 자정 자동 실행
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://pwyflwjtafarkwbejoen.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3eWZsd2p0YWZhcmt3YmVqb2VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYzNTIzMSwiZXhwIjoyMDg3MjExMjMxfQ.DWtKZHpkM9D-mR26mG1ncrVHi2vxIre3l7-9bH4IVEE';

// 백업 저장 경로 (프로젝트 폴더 내 backups 폴더)
const BACKUP_ROOT = path.join(__dirname, 'backups');

// 백업할 테이블 목록
const TABLES = [
    { name: 'students',     select: '*' },
    { name: 'surveys',      select: '*' },
    { name: 'life_records', select: '*' },
    { name: 'teachers',     select: 'id, email, name, role, assigned_class, created_at' },
];

// 30일 이상된 백업 자동 삭제 (디스크 절약)
const KEEP_DAYS = 30;

async function fetchAll(supabase, table, select) {
    let rows = [];
    let from = 0;
    const CHUNK = 1000;
    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select(select)
            .range(from, from + CHUNK - 1);
        if (error) throw new Error(`${table} 조회 오류: ${error.message}`);
        rows = rows.concat(data);
        if (data.length < CHUNK) break;
        from += CHUNK;
    }
    return rows;
}

function getDateStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function cleanOldBackups() {
    if (!fs.existsSync(BACKUP_ROOT)) return;
    const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
    fs.readdirSync(BACKUP_ROOT).forEach(dir => {
        const fullPath = path.join(BACKUP_ROOT, dir);
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
    const backupDir = path.join(BACKUP_ROOT, dateStr);

    // 이미 오늘 백업이 있으면 덮어쓰기
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    console.log(`\n📦 OneClass25 DB 백업 시작 (${dateStr})\n`);

    let totalRows = 0;
    for (const { name, select } of TABLES) {
        try {
            process.stdout.write(`  ⏳ ${name} 백업 중...`);
            const rows = await fetchAll(supabase, name, select);
            const filePath = path.join(backupDir, `${name}.json`);
            fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf-8');
            console.log(` ✅ ${rows.length}건 → ${name}.json`);
            totalRows += rows.length;
        } catch (err) {
            console.error(` ❌ 오류: ${err.message}`);
        }
    }

    // 백업 메타데이터
    const meta = {
        date: dateStr,
        createdAt: new Date().toISOString(),
        tables: TABLES.map(t => t.name),
        totalRows,
    };
    fs.writeFileSync(path.join(backupDir, '_meta.json'), JSON.stringify(meta, null, 2));

    console.log(`\n✅ 백업 완료! 총 ${totalRows}건 → ${backupDir}\n`);

    // 오래된 백업 정리
    cleanOldBackups();
}

main().catch(err => {
    console.error('❌ 백업 실패:', err);
    process.exit(1);
});
