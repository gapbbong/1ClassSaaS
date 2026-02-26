import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectClass34() {
    console.log("3-4반 학생 및 설문 데이터 정밀 점검...");

    try {
        // 1. 3-4반 학생 목록
        const { data: students, error: sError } = await supabase
            .from('students')
            .select('pid, name, student_id')
            .eq('class_info', '3-4')
            .order('student_id');

        if (sError) throw sError;

        // 2. 해당 학생들의 설문 데이터
        const pids = students.map(s => s.pid);
        const { data: surveys, error: qError } = await supabase
            .from('surveys')
            .select('id, student_pid, submitted_at')
            .in('student_pid', pids);

        if (qError) throw qError;

        console.log("--- 학생 목록 (3401~3410) ---");
        students.filter(s => parseInt(s.student_id) <= 3410).forEach(s => {
            const survey = surveys.find(sur => String(sur.student_pid) === String(s.pid));
            console.log(`[${s.student_id}] ${s.name} (PID: ${s.pid}) -> ${survey ? '✅ 제출됨 (' + survey.submitted_at + ')' : '❌ 미제출'}`);
        });

    } catch (error) {
        console.error("점검 중 오류:", error);
    }
}

inspectClass34();
