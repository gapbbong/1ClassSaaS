import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function recover202MissingStudents() {
    console.log("🚀 2학년 2반 누락 학생 복구 시작...");

    // 누락된 학생 리스트 (작년 1학년 2반 데이터 기반 추정 및 대조)
    const missingStudents = [
        { name: "김지안", oldId: "1207", newId: "2207" },
        { name: "신재겸", oldId: "1208", newId: "2208" },
        { name: "안성윤", oldId: "1212", newId: "2212" },
        { name: "용승준", oldId: "1213", newId: "2213" },
        { name: "이채안", oldId: "1214", newId: "2214" }
    ];

    for (const s of missingStudents) {
        try {
            // 1. 작년 데이터 찾기
            const { data: oldData, error: oldError } = await supabase
                .from('students')
                .select('*')
                .eq('student_id', s.oldId)
                .eq('academic_year', 2025)
                .single();

            if (oldError || !oldData) {
                console.warn(`⚠️ 작년 데이터 찾기 실패: ${s.name} (${s.oldId})`);
                continue;
            }

            // 2. 2026학년도로 진급 데이터 삽입
            const { error: insertError } = await supabase
                .from('students')
                .insert([{
                    ...oldData,
                    pid: undefined, // 새 PID 생성
                    student_id: s.newId,
                    academic_year: 2026,
                    class_info: '2-2',
                    status: 'active',
                    created_at: undefined
                }]);

            if (insertError) throw insertError;

            // 3. 학생 이력(history) 기록
            await supabase.from('student_history').insert([{
                student_pid: (await supabase.from('students').select('pid').eq('student_id', s.newId).eq('academic_year', 2026).single()).data.pid,
                academic_year: 2025,
                grade: 1,
                class_num: 2,
                num: parseInt(s.oldId.substring(2))
            }]);

            console.log(`✅ 복구 완료: ${s.name} (${s.oldId} -> ${s.newId})`);
        } catch (e) {
            console.error(`❌ 복구 실패 (${s.name}):`, e.message);
        }
    }

    console.log("\n✨ 2학년 2반 누락 인원 복구가 완료되었습니다.");
}

recover202MissingStudents();
