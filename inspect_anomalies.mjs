import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectInsights() {
    try {
        const { data: insights, error } = await supabase
            .from('student_insights')
            .select('id, student_pid, content')
            .eq('insight_type', 'omni');

        if (error) throw error;

        console.log(`\n🔍 [분석 데이터 상세 점검] 총 ${insights.length}건`);

        const anomalies = [];
        const pidCounts = {};

        for (const item of insights) {
            pidCounts[item.student_pid] = (pidCounts[item.student_pid] || 0) + 1;

            let isAnomaly = false;
            let reason = "";

            if (!item.content || String(item.content).trim() === "" || String(item.content) === "undefined") {
                isAnomaly = true;
                reason = "내용 비어있음/undefined";
            } else if (String(item.content).length < 100) {
                isAnomaly = true;
                reason = "내용 너무 짧음 (" + String(item.content).length + "자)";
            } else if (item.content.includes("error") || item.content.includes("failed")) {
                isAnomaly = true;
                reason = "에러 키워드 포함";
            }

            if (isAnomaly) {
                anomalies.push({
                    id: item.id,
                    pid: item.student_pid,
                    reason,
                    contentPreview: item.content ? String(item.content).substring(0, 50) + "..." : "null"
                });
            }
        }

        const dupes = Object.entries(pidCounts).filter(([pid, count]) => count > 1);

        if (anomalies.length > 0 || dupes.length > 0) {
            const { data: students } = await supabase.from('students').select('pid, name');
            const nameMap = Object.fromEntries(students.map(s => [s.pid, s.name]));

            if (anomalies.length > 0) {
                console.log(`\n⚠️ 이상 내용 발견: ${anomalies.length}건`);
                anomalies.forEach((a, idx) => {
                    const name = nameMap[a.pid] || "알 수 없음";
                    console.log(`${idx + 1}. [${name}] 사유: ${a.reason} | 요약: ${a.contentPreview}`);
                });
            }

            if (dupes.length > 0) {
                console.log(`\n👯 중복 분석 발견 (동일 학생 데이터가 여러 개): ${dupes.length}명`);
                dupes.forEach(([pid, count], idx) => {
                    const name = nameMap[pid] || "알 수 없음";
                    console.log(`${idx + 1}. [${name}] : ${count}건 중복`);
                });
            }
        } else {
            console.log(`\n✅ 이상 내용이나 중복 데이터가 발견되지 않았습니다.`);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

inspectInsights();
