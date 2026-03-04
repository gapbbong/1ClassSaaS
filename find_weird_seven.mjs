import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findSevenWeirdOnes() {
    try {
        const { data: insights } = await supabase.from('student_insights').select('*, students(name)').eq('insight_type', 'omni');
        const { data: students } = await supabase.from('students').select('pid, name');
        const nameMap = Object.fromEntries(students.map(s => [s.pid, s.name]));

        console.log(`\n🔍 분석 데이터 심층 진단 (총 ${insights.length}건)`);

        const pids = new Set(insights.map(i => i.student_pid));
        const results = [];

        for (const pid of pids) {
            const studentInsights = insights.filter(i => i.student_pid === pid);
            const name = nameMap[pid] || "알 수 없음";

            // 체크 1: 중복 건수
            if (studentInsights.length > 1) {
                results.push({ name, pid, type: 'DUPE', count: studentInsights.length, data: studentInsights });
            }

            // 체크 2: 내용 부실 또는 에러
            for (const si of studentInsights) {
                const c = si.content;
                const cStr = JSON.stringify(c);
                if (!c || cStr.length < 200 || cStr.includes("error") || cStr.includes("fail") || !c.summary) {
                    results.push({ name, pid, type: 'BAD_CONTENT', reason: '내용 부실/에러', data: si });
                }
            }
        }

        console.log(`\n⚠️ 발견된 이상 학생 목록:`);
        results.forEach((r, idx) => {
            if (r.type === 'DUPE') {
                console.log(`${idx + 1}. [${r.name}] 중복 발생 (${r.count}건)`);
            } else {
                console.log(`${idx + 1}. [${r.name}] 데이터 이상 (${r.reason})`);
            }
        });

        // 7명인 경우를 특히 주목
        if (results.length === 7) {
            console.log(`\n🎯 딱 7명이네요! 이 학생들인 것 같습니다.`);
        }

    } catch (e) { console.error(e); }
}

findSevenWeirdOnes();
