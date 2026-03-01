
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const academicYear = 2026;

    // 1. 2026년 학생 중 설문 안 낸 학생 찾기
    console.log("Searching for a 2026 student without a survey...");

    const { data: students } = await supabase.from('students').select('pid, name, student_id').eq('academic_year', academicYear).limit(50);
    const { data: surveys } = await supabase.from('surveys').select('student_pid');

    const submittedPids = new Set((surveys || []).map(s => s.student_pid));
    const target = (students || []).find(s => !submittedPids.has(s.pid));

    if (!target) {
        console.log("No available 2026 student without a survey found.");
        return;
    }

    console.log(`Targeting student: ${target.name} (${target.student_id}, PID: ${target.pid})`);

    const mockData = {
        data: {
            "성격": "매우 성실하고 책임감이 강함",
            "취미": "운동, 영화 감상",
            "진로희망": "데이터 과학자",
            "MBTI": "ISTJ",
            "혈액형": "B",
            "가족관계": "부모님, 형",
            "특기": "농구, 코딩"
        }
    };

    console.log("Inserting mock survey...");
    const { error: insertError } = await supabase
        .from('surveys')
        .insert([
            {
                student_pid: target.pid,
                data: mockData,
                submitted_at: new Date().toISOString()
            }
        ]);

    if (insertError) {
        console.error("Insert failed:", insertError);
    } else {
        console.log(`✅ Successfully inserted mock survey for ${target.name} (${target.student_id})!`);
        console.log("이 학생은 이제 '소유자 전용 AI 배치 분석'의 대상에 포함됩니다.");
    }
}

run();
