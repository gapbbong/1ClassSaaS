/**
 * migrate_records_v2.js
 * 
 * GAS의 기존 getStudentRecords API를 사용하여
 * 각 학생별로 기록을 가져와 Supabase life_records 테이블로 이관합니다.
 * (getAllRecords GAS 배포 없이 동작)
 * 
 * 실행: node migrate_records_v2.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GAS_URL = "https://script.google.com/macros/s/AKfycbyfadmRNyOpRww3m13PVnx_E_6ft9gzrqleOx2q_8X9WXFpom31vYpgjzZg9MK01hcZ3Q/exec";

// 1ms 딜레이 유틸
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchRecordsForStudent(num) {
    const url = `${GAS_URL}?action=getStudentRecords&num=${num}`;
    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

async function main() {
    try {
        // 1. Supabase에서 전체 학생 목록 (pid, student_id) 조회
        console.log("📋 Supabase에서 학생 목록 가져오는 중...");
        const { data: students, error: sErr } = await supabase
            .from('students')
            .select('pid, student_id')
            .order('student_id');

        if (sErr) throw sErr;
        console.log(`✅ ${students.length}명 확인`);

        // 2. 기존 life_records 중복 방지용 체크 (student_pid + created_at)
        const { data: existing, error: eErr } = await supabase
            .from('life_records')
            .select('student_pid, created_at');

        if (eErr) throw eErr;
        const existingSet = new Set(existing.map(r => `${r.student_pid}_${r.created_at}`));
        console.log(`⚠️  기존 기록 ${existing.length}건 (중복 스킵 예정)`);

        // 3. 학생별로 GAS에서 기록 가져와서 삽입
        let totalInserted = 0;
        let totalSkipped = 0;

        for (let i = 0; i < students.length; i++) {
            const s = students[i];
            const records = await fetchRecordsForStudent(s.student_id);

            if (records.length === 0) {
                process.stdout.write('.');
                await delay(200); // GAS 요청 제한 방지
                continue;
            }

            const insertData = [];
            for (const r of records) {
                const createdAt = r.time
                    ? (typeof r.time === 'string' ? new Date(r.time).toISOString() : new Date(r.time).toISOString())
                    : new Date().toISOString();

                const key = `${s.pid}_${createdAt}`;
                if (existingSet.has(key)) {
                    totalSkipped++;
                    continue;
                }

                const isPositive = !!r.good;
                const category = r.good || r.bad || "기록";
                const content = r.detail || "";

                insertData.push({
                    student_pid: s.pid,
                    category,
                    content,
                    is_positive: isPositive,
                    teacher_email_prefix: r.teacher || "선생님",
                    created_at: createdAt
                });
                existingSet.add(key);
            }

            if (insertData.length > 0) {
                const { error: iErr } = await supabase.from('life_records').insert(insertData);
                if (iErr) {
                    console.error(`\n❌ ${s.student_id} 삽입 실패:`, iErr.message);
                } else {
                    totalInserted += insertData.length;
                    process.stdout.write(`\n✅ ${s.student_id}: ${insertData.length}건`);
                }
            }

            await delay(300); // GAS과부하 방지
        }

        console.log(`\n\n🎉 이관 완료!`);
        console.log(`   삽입: ${totalInserted}건`);
        console.log(`   스킵(중복): ${totalSkipped}건`);

    } catch (err) {
        console.error("❌ 오류:", err.message);
        process.exit(1);
    }
}

main();
