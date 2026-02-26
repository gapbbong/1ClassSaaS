import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepAnalysis() {
    console.log("🕵️‍♂️ [심층 분석] 유실된 학생 데이터 추적...");

    // 1. student_history에서 2025학년도 2학년이었던 기록 모두 추출
    const { data: history2025_g2 } = await supabase
        .from('student_history')
        .select('*')
        .eq('academic_year', 2025)
        .ilike('class_info', '2-%');

    console.log(`\n📜 히스토리 상 2025년 2학년 기록: ${history2025_g2?.length || 0}건`);

    // 2. 현재 students 테이블에서 2025년 2학년이었던 학생들의 현 상태(PID 기준)
    if (history2025_g2 && history2025_g2.length > 0) {
        const pids = history2025_g2.map(h => h.student_pid);
        const { data: currentStatus } = await supabase
            .from('students')
            .select('pid, name, student_id, academic_year, status, class_info')
            .in('pid', pids);

        console.log(`\n📍 해당 학생들의 현재 DB 상태 요약:`);
        const stats = {
            active_2026: 0,
            graduated_2025: 0,
            other: 0
        };
        currentStatus.forEach(s => {
            if (s.academic_year === 2026 && s.status === 'active') stats.active_2026++;
            else if (s.status === 'graduated') stats.graduated_2025++;
            else stats.other++;
        });
        console.log(stats);

        // 데이터 샘플 (첫 5명)
        // console.log("샘플:", currentStatus.slice(0, 5));
    }

    // 3. 3학년 5반에 섞여있다는 '전기과' 학생 조사 (3-5는 게임과/토목과?)
    const { data: class3_5 } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', 2026)
        .eq('class_info', '3-5');
    console.log(`\n⚡ 3학년 5반 현재 명단 (${class3_5?.length || 0}명):`);
    class3_5?.forEach(s => console.log(`- ${s.name} (${s.student_id}) status: ${s.status}`));
}

deepAnalysis();
