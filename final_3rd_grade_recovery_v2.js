import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
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

async function runPerfectRecovery() {
    console.log("🚀 [완벽 복구] 동명이인 구분 및 100% 매칭 시작...");

    // 1. 모든 학생 기본 정보 로드 (name_map 재활용 및 최신화)
    const { data: allStudents } = await supabase.from('students').select('*');

    // 2. 2025년 이력 데이터 로드
    const { data: history2025 } = await supabase.from('student_history').select('*').eq('academic_year', 2025);

    const usedPids = new Set();
    let successCount = 0;
    let failCount = 0;

    for (const plan of recoveryPlan) {
        const [grade, classNum] = plan.class.split('-');
        console.log(`\n📦 ${plan.class}반 복구...`);

        for (let i = 0; i < plan.students.length; i++) {
            const name = plan.students[i];
            const num = i + 1;
            const studentId = `${grade}${classNum}${num.toString().padStart(2, '0')}`;

            // 후보군 추출 (사용되지 않은 PID 위주)
            let candidates = allStudents.filter(s => s.name === name && !usedPids.has(s.pid));

            if (candidates.length === 0) {
                // 이미 사용된 PID들 중 이름이 같은 게 있는지 (완전 누락인지 확인)
                const totalNamed = allStudents.filter(s => s.name === name);
                if (totalNamed.length === 0) {
                    console.warn(`🆕 [신규생성] ${name} (${studentId})`);
                    const { data: ns, error: ie } = await supabase.from('students').insert([{ name, academic_year: 2026, status: 'active', class_info: plan.class, student_id: studentId }]).select();
                    if (!ie) {
                        usedPids.add(ns[0].pid);
                        successCount++;
                    } else { failCount++; }
                } else {
                    console.error(`⚠️ [중복이름부족] ${name} - 추가 PID가 없습니다.`);
                    failCount++;
                }
                continue;
            }

            // 가장 적절한 후보 선택: 2025년 2학년이었던 학생을 우선적으로 매칭
            candidates.sort((a, b) => {
                const histA = history2025.find(h => h.student_pid === a.pid && h.class_info.startsWith('2-'));
                const histB = history2025.find(h => h.student_pid === b.pid && h.class_info.startsWith('2-'));
                if (histA && !histB) return -1;
                if (!histA && histB) return 1;
                return 0;
            });

            const target = candidates[0];
            const { error: ue } = await supabase
                .from('students')
                .update({ academic_year: 2026, status: 'active', class_info: plan.class, student_id: studentId })
                .eq('pid', target.pid);

            if (!ue) {
                console.log(`✅ [복구] ${name} (${studentId}) - PID: ${target.pid.substring(0, 8)}...`);
                usedPids.add(target.pid);
                successCount++;
            } else {
                console.error(`❌ [실패] ${name}: ${ue.message}`);
                failCount++;
            }
        }
    }

    console.log(`\n✨ 최종 집계: 성공 ${successCount}명, 실패 ${failCount}명`);
}

runPerfectRecovery();
