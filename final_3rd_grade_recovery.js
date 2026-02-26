import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const recoveryPlan = [
    { class: "3-1", students: ["김현수", "김지현", "박준영", "박진우", "서민재", "안준수", "오준석", "이성현", "임준환", "장준수", "정우진", "최진혁"] },
    { class: "3-2", students: ["김산", "김성은", "김성재", "김성준", "김승민", "김승환", "김영재", "김준서", "김준성", "김준수", "김진수", "김태윤", "김현민", "김현우", "박민수", "박성민", "박정민", "정민규", "정원석"] },
    { class: "3-3", students: ["HAN PANG WEN", "강수안", "강지원", "김민재", "김승우", "김우진", "김재원", "노현석", "박민성", "박준수", "박준우", "박현우", "서예준", "장하준", "최강"] },
    { class: "3-4", students: ["강태민", "김도균", "김도윤", "김민성", "김성현", "김준혁", "김진우", "김태경", "김현수", "문성민", "박건우", "박정현", "서준석", "오유민", "유승현", "윤하준", "이준서", "이현우", "조영현", "현종호"] },
    { class: "3-5", students: ["강서진", "강신혁", "고준호", "김민준", "김범수", "김성민", "김재현", "박시후", "박재현", "서준석", "신지민", "오민서", "유하준", "이도윤", "정윤호", "정준혁", "황지현"] },
    { class: "3-6", students: ["강지희", "박민서", "박서연", "서지민", "안서진", "윤서현", "윤예원", "이가은", "이서아", "이서현", "이예린", "이지윤", "이지은", "장지우", "정예진", "최다은", "최세정"] }
];

async function runRecovery() {
    console.log("🚀 [최종 복구] 2026학년도 3학년 데이터 구출 및 정화 시작...");

    // 1. 현재 3학년(2026) 데이터 싹 정리 (유령 학생 제거)
    console.log("🧹 현재 오염된 3학년 데이터 격리 중...");
    await supabase.from('students').update({ academic_year: 2025, status: 'graduated' }).eq('academic_year', 2026).ilike('class_info', '3-%');

    // 2. 전체 학생 명단 로드 (이름으로 찾기 위해)
    const { data: allStudents } = await supabase.from('students').select('*');

    let successCount = 0;
    let failCount = 0;

    for (const plan of recoveryPlan) {
        const [grade, classNum] = plan.class.split('-');
        console.log(`\n📦 ${plan.class}반 구출 중...`);

        for (let i = 0; i < plan.students.length; i++) {
            const name = plan.students[i];
            const num = i + 1;
            const studentId = `${grade}${classNum}${num.toString().padStart(2, '0')}`;

            // 이름으로 후보 찾기
            let candidates = allStudents.filter(s => s.name === name);

            if (candidates.length === 0) {
                console.warn(`⚠️ [경고] ${name} 학생을 DB에서 찾을 수 없습니다. 신규 생성합니다.`);

                const { data: newStu, error: insError } = await supabase
                    .from('students')
                    .insert([{
                        name,
                        academic_year: 2026,
                        status: 'active',
                        class_info: plan.class,
                        student_id: studentId
                    }])
                    .select();

                if (insError) {
                    console.error(`❌ [신규실패] ${name}: ${insError.message}`);
                    failCount++;
                } else {
                    console.log(`🆕 [신규] ${name} (${studentId}) 생성 완료.`);
                    successCount++;
                }
                continue;
            }

            // 후보 중 가장 적절한 학생 선택 (작년 학번이 비슷하거나, graduated 상태인 학생)
            let target = candidates.find(c => c.status === 'graduated') || candidates[0];

            const { error: updError } = await supabase
                .from('students')
                .update({
                    academic_year: 2026,
                    status: 'active',
                    class_info: plan.class,
                    student_id: studentId
                })
                .eq('pid', target.pid);

            if (updError) {
                console.error(`❌ [구출실패] ${name}: ${updError.message}`);
                failCount++;
            } else {
                console.log(`💪 [구출성공] ${name} (${studentId}) 복격 완료.`);
                successCount++;
            }
        }
    }

    console.log(`\n✨ 전면 복구 작업 완료!`);
    console.log(`- 복구/생성 성공: ${successCount}명`);
    console.log(`- 실패: ${failCount}명`);
}

runRecovery();
