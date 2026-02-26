import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectHistoryNames() {
    console.log("🕵️ [조사] 2025년 이력 기준 학생 실명 현황...");

    const { data: history } = await supabase
        .from('student_history')
        .select('student_pid, class_info, academic_year')
        .eq('academic_year', 2025);

    const pids = history.map(h => h.student_pid);
    const { data: students } = await supabase
        .from('students')
        .select('pid, name, student_id')
        .in('pid', pids);

    const map = {};
    students.forEach(s => { map[s.pid] = s; });

    const result = history.map(h => ({
        ...h,
        current_name: map[h.student_pid]?.name,
        current_student_id: map[h.student_pid]?.student_id
    }));

    // 반별로 정렬
    result.sort((a, b) => a.class_info.localeCompare(b.class_info));

    fs.writeFileSync('history_name_analysis.json', JSON.stringify(result, null, 2));
    console.log("💾 'history_name_analysis.json' 저장 완료.");
}

inspectHistoryNames();
