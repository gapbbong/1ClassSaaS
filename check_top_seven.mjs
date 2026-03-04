import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const TOP_7_NAMES = ["조재범", "박성현", "문정안", "김동욱", "성재원", "김동혁", "서영범"];

async function checkTop7() {
    const { data: stds } = await supabase.from('students').select('pid, name').in('name', TOP_7_NAMES);
    const pids = stds.map(s => s.pid);

    const { data: insights } = await supabase.from('student_insights').select('*').in('student_pid', pids).eq('insight_type', 'omni');

    console.log(`\n🧐 상위 7명(중복 최다) 데이터 정밀 점검`);

    for (const name of TOP_7_NAMES) {
        const student = stds.find(s => s.name === name);
        if (!student) continue;

        const mine = insights.filter(i => i.student_pid === student.pid);
        console.log(`\n[${name}] 건수: ${mine.length}`);

        // 첫 번째 데이터와 마지막 데이터가 같은지 확인
        if (mine.length > 1) {
            const first = JSON.stringify(mine[0].content).substring(0, 100);
            const last = JSON.stringify(mine[mine.length - 1].content).substring(0, 100);
            console.log(`- 첫 번째 샘플: ${first}...`);
            console.log(`- 마지막 샘플: ${last}...`);
            if (first === last) {
                console.log(`- 결과: 완전히 동일한 내용이 반복 저장됨.`);
            } else {
                console.log(`- 결과: 내용이 서로 다름 (재분석됨).`);
            }
        }
    }
}

checkTop7();
