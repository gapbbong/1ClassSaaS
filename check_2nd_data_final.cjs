const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkData() {
    console.log("=== 2025학년도 2학년 전체 데이터 전수 조사 ===");
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('academic_year', 2025)
            .like('class_info', '2-%');

        if (error) throw error;

        console.log(`총 학생 수: ${data.length}`);

        // 1. 자퇴생 출력
        const dropouts = data.filter(s => s.status === 'withdrawn' || s.status === '자퇴');
        console.log(`\n[자퇴생 목록 - 총 ${dropouts.length}명]`);
        dropouts.forEach(s => {
            console.log(`- ${s.name} (${s.class_info}, 학번: ${s.student_id}, 상태: ${s.status})`);
        });

        // 2. 기타 학적 변동자
        const others = data.filter(s => !['active', '재학'].includes(s.status));
        console.log(`\n[기타 학적 상태 목록]`);
        others.forEach(s => {
            if (s.status !== 'withdrawn' && s.status !== '자퇴') {
                console.log(`- ${s.name} (${s.class_info}, 학번: ${s.student_id}, 상태: ${s.status})`);
            }
        });

        // 3. 남현빈 확인
        const nhb = data.filter(s => s.name.replace(/\s/g, '').includes('남현빈'));
        console.log(`\n[남현빈 학생 데이터 확인]`);
        console.log(JSON.stringify(nhb, null, 2));

    } catch (e) {
        console.error("오류 발생:", e.message);
    }
    process.exit(0);
}

checkData();
