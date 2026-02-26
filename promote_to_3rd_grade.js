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

// 2026학년도 3학년 진급 명단 (이미지 분석 결과)
const promotionData = [
    // 3학년 1반 (IoT전기과)
    { name: "김현수", newGrade: 3, newClass: 1, newNum: 1, oldGrade: 2, oldClass: 1, oldNum: 1 },
    { name: "남강현", newGrade: 3, newClass: 1, newNum: 2, oldGrade: 2, oldClass: 1, oldNum: 2 },
    { name: "박영재", newGrade: 3, newClass: 1, newNum: 3, oldGrade: 2, oldClass: 1, oldNum: 3 },
    { name: "박우주", newGrade: 3, newClass: 1, newNum: 4, oldGrade: 2, oldClass: 1, oldNum: 4 },
    { name: "박태용", newGrade: 3, newClass: 1, newNum: 5, oldGrade: 2, oldClass: 1, oldNum: 5 },
    { name: "백건우", newGrade: 3, newClass: 1, newNum: 6, oldGrade: 2, oldClass: 1, oldNum: 6 },
    { name: "심호영", newGrade: 3, newClass: 1, newNum: 7, oldGrade: 2, oldClass: 1, oldNum: 8 },
    { name: "이우성", newGrade: 3, newClass: 1, newNum: 8, oldGrade: 2, oldClass: 1, oldNum: 9 },
    { name: "이지백", newGrade: 3, newClass: 1, newNum: 9, oldGrade: 2, oldClass: 1, oldNum: 10 },
    { name: "정규민", newGrade: 3, newClass: 1, newNum: 10, oldGrade: 2, oldClass: 1, oldNum: 11 },
    { name: "진정한", newGrade: 3, newClass: 1, newNum: 11, oldGrade: 2, oldClass: 1, oldNum: 12 },
    { name: "최진혁", newGrade: 3, newClass: 1, newNum: 12, oldGrade: 2, oldClass: 1, oldNum: 13 },

    // 3학년 2반 (IoT전기과)
    { name: "김산", newGrade: 3, newClass: 2, newNum: 1, oldGrade: 2, oldClass: 2, oldNum: 1 },
    { name: "김시준", newGrade: 3, newClass: 2, newNum: 2, oldGrade: 2, oldClass: 2, oldNum: 2 },
    { name: "김지현", newGrade: 3, newClass: 2, newNum: 3, oldGrade: 2, oldClass: 2, oldNum: 3 },
    { name: "김진현", newGrade: 3, newClass: 2, newNum: 4, oldGrade: 2, oldClass: 2, oldNum: 4 },
    { name: "김태원", newGrade: 3, newClass: 2, newNum: 5, oldGrade: 2, oldClass: 2, oldNum: 5 },
    { name: "김하율", newGrade: 3, newClass: 2, newNum: 6, oldGrade: 2, oldClass: 2, oldNum: 6 },
    { name: "김하진", newGrade: 3, newClass: 2, newNum: 7, oldGrade: 2, oldClass: 2, oldNum: 7 },
    { name: "문채린", newGrade: 3, newClass: 2, newNum: 8, oldGrade: 2, oldClass: 2, oldNum: 8 },
    { name: "박고영", newGrade: 3, newClass: 2, newNum: 9, oldGrade: 2, oldClass: 2, oldNum: 9 },
    { name: "박상규", newGrade: 3, newClass: 2, newNum: 10, oldGrade: 2, oldClass: 2, oldNum: 10 },
    { name: "배은찬", newGrade: 3, newClass: 2, newNum: 11, oldGrade: 2, oldClass: 2, oldNum: 11 },
    { name: "백승준", newGrade: 3, newClass: 2, newNum: 12, oldGrade: 2, oldClass: 2, oldNum: 12 },
    { name: "손민준", newGrade: 3, newClass: 2, newNum: 13, oldGrade: 2, oldClass: 2, oldNum: 13 },
    { name: "이도형", newGrade: 3, newClass: 2, newNum: 14, oldGrade: 2, oldClass: 2, oldNum: 14 },
    { name: "이영준", newGrade: 3, newClass: 2, newNum: 15, oldGrade: 2, oldClass: 2, oldNum: 15 },
    { name: "이채율", newGrade: 3, newClass: 2, newNum: 16, oldGrade: 2, oldClass: 2, oldNum: 16 },
    { name: "이지연", newGrade: 3, newClass: 2, newNum: 17, oldGrade: 2, oldClass: 2, oldNum: 17 },
    { name: "정다은", newGrade: 3, newClass: 2, newNum: 18, oldGrade: 2, oldClass: 2, oldNum: 18 },
    { name: "정원석", newGrade: 3, newClass: 2, newNum: 19, oldGrade: 2, oldClass: 2, oldNum: 19 },

    // 3학년 3반 (IoT전기과)
    { name: "HAN PANGWEN", newGrade: 3, newClass: 3, newNum: 1, oldGrade: 2, oldClass: 3, oldNum: 1 },
    { name: "김범석", newGrade: 3, newClass: 3, newNum: 2, oldGrade: 2, oldClass: 3, oldNum: 3 },
    { name: "김시율", newGrade: 3, newClass: 3, newNum: 3, oldGrade: 2, oldClass: 3, oldNum: 4 },
    { name: "김어진", newGrade: 3, newClass: 3, newNum: 4, oldGrade: 2, oldClass: 3, oldNum: 5 },
    { name: "김현준", newGrade: 3, newClass: 3, newNum: 5, oldGrade: 2, oldClass: 3, oldNum: 6 },
    { name: "문승민", newGrade: 3, newClass: 3, newNum: 6, oldGrade: 2, oldClass: 3, oldNum: 7 },
    { name: "박동현", newGrade: 3, newClass: 3, newNum: 7, oldGrade: 2, oldClass: 3, oldNum: 8 },
    { name: "박준배", newGrade: 3, newClass: 3, newNum: 8, oldGrade: 2, oldClass: 3, oldNum: 9 },
    { name: "손민영", newGrade: 3, newClass: 3, newNum: 9, oldGrade: 2, oldClass: 1, oldNum: 7 },
    { name: "이종혁", newGrade: 3, newClass: 3, newNum: 10, oldGrade: 2, oldClass: 3, oldNum: 10 },
    { name: "유수민", newGrade: 3, newClass: 3, newNum: 11, oldGrade: 2, oldClass: 3, oldNum: 11 },
    { name: "이은서", newGrade: 3, newClass: 3, newNum: 12, oldGrade: 2, oldClass: 3, oldNum: 13 },
    { name: "장우찬", newGrade: 3, newClass: 3, newNum: 13, oldGrade: 2, oldClass: 3, oldNum: 14 },
    { name: "정성희", newGrade: 3, newClass: 3, newNum: 14, oldGrade: 2, oldClass: 3, oldNum: 15 },
    { name: "최강", newGrade: 3, newClass: 3, newNum: 15, oldGrade: 2, oldClass: 3, oldNum: 16 },

    // 3학년 4반 (전자제어과)
    { name: "양서진", newGrade: 3, newClass: 4, newNum: 1, oldGrade: 2, oldClass: 4, oldNum: 1 },
    { name: "강선", newGrade: 3, newClass: 4, newNum: 2, oldGrade: 2, oldClass: 4, oldNum: 2 },
    { name: "김민준", newGrade: 3, newClass: 4, newNum: 3, oldGrade: 2, oldClass: 4, oldNum: 3 },
    { name: "김서영", newGrade: 3, newClass: 4, newNum: 4, oldGrade: 2, oldClass: 4, oldNum: 4 },
    { name: "김서율", newGrade: 3, newClass: 4, newNum: 5, oldGrade: 2, oldClass: 4, oldNum: 5 },
    { name: "남한진", newGrade: 3, newClass: 4, newNum: 6, oldGrade: 2, oldClass: 4, oldNum: 20 },
    { name: "노민규", newGrade: 3, newClass: 4, newNum: 7, oldGrade: 2, oldClass: 4, oldNum: 6 },
    { name: "박인혁", newGrade: 3, newClass: 4, newNum: 8, oldGrade: 2, oldClass: 4, oldNum: 7 },
    { name: "박승호", newGrade: 3, newClass: 4, newNum: 9, oldGrade: 2, oldClass: 4, oldNum: 8 },
    { name: "배건우", newGrade: 3, newClass: 4, newNum: 10, oldGrade: 2, oldClass: 4, oldNum: 9 },
    { name: "배유진", newGrade: 3, newClass: 4, newNum: 11, oldGrade: 2, oldClass: 4, oldNum: 10 },
    { name: "송유찬", newGrade: 3, newClass: 4, newNum: 12, oldGrade: 2, oldClass: 4, oldNum: 11 },
    { name: "신지유", newGrade: 3, newClass: 4, newNum: 13, oldGrade: 2, oldClass: 4, oldNum: 12 },
    { name: "안준식", newGrade: 3, newClass: 4, newNum: 14, oldGrade: 2, oldClass: 4, oldNum: 13 },
    { name: "이용민", newGrade: 3, newClass: 4, newNum: 15, oldGrade: 2, oldClass: 4, oldNum: 14 },
    { name: "이유준", newGrade: 3, newClass: 4, newNum: 16, oldGrade: 2, oldClass: 4, oldNum: 15 },
    { name: "임도현", newGrade: 3, newClass: 4, newNum: 17, oldGrade: 2, oldClass: 4, oldNum: 16 },
    { name: "지유찬", newGrade: 3, newClass: 4, newNum: 18, oldGrade: 2, oldClass: 4, oldNum: 17 },
    { name: "한승빈", newGrade: 3, newClass: 4, newNum: 19, oldGrade: 2, oldClass: 4, oldNum: 18 },
    { name: "황동호", newGrade: 3, newClass: 4, newNum: 20, oldGrade: 2, oldClass: 4, oldNum: 19 },

    // 3학년 5반 (전자제어과)
    { name: "강시환", newGrade: 3, newClass: 5, newNum: 1, oldGrade: 2, oldClass: 6, oldNum: 1 },
    { name: "김우찬", newGrade: 3, newClass: 5, newNum: 2, oldGrade: 2, oldClass: 6, oldNum: 5 },
    { name: "김주원", newGrade: 3, newClass: 5, newNum: 3, oldGrade: 2, oldClass: 6, oldNum: 6 },
    { name: "박건하", newGrade: 3, newClass: 5, newNum: 4, oldGrade: 2, oldClass: 5, oldNum: 4 },
    { name: "박건우", newGrade: 3, newClass: 5, newNum: 5, oldGrade: 2, oldClass: 6, oldNum: 7 },
    { name: "박태율", newGrade: 3, newClass: 5, newNum: 6, oldGrade: 2, oldClass: 6, oldNum: 8 },
    { name: "배자민", newGrade: 3, newClass: 5, newNum: 7, oldGrade: 2, oldClass: 6, oldNum: 10 },
    { name: "송시창", newGrade: 3, newClass: 5, newNum: 8, oldGrade: 2, oldClass: 6, oldNum: 12 },
    { name: "심유공", newGrade: 3, newClass: 5, newNum: 9, oldGrade: 2, oldClass: 5, oldNum: 7 },
    { name: "양준헌", newGrade: 3, newClass: 5, newNum: 10, oldGrade: 2, oldClass: 6, oldNum: 13 },
    { name: "이도윤", newGrade: 3, newClass: 5, newNum: 11, oldGrade: 2, oldClass: 6, oldNum: 14 },
    { name: "이유후", newGrade: 3, newClass: 5, newNum: 12, oldGrade: 2, oldClass: 5, oldNum: 11 },
    { name: "이지호", newGrade: 3, newClass: 5, newNum: 13, oldGrade: 2, oldClass: 5, oldNum: 12 },
    { name: "전보민", newGrade: 3, newClass: 5, newNum: 14, oldGrade: 2, oldClass: 6, oldNum: 16 },
    { name: "장하윤", newGrade: 3, newClass: 5, newNum: 15, oldGrade: 2, oldClass: 5, oldNum: 15 },
    { name: "최민준", newGrade: 3, newClass: 5, newNum: 16, oldGrade: 2, oldClass: 6, oldNum: 17 },
    { name: "황치현", newGrade: 3, newClass: 5, newNum: 17, oldGrade: 2, oldClass: 5, oldNum: 18 },

    // 3학년 6반 (전자제어과)
    { name: "김다희", newGrade: 3, newClass: 6, newNum: 1, oldGrade: 2, oldClass: 5, oldNum: 1 },
    { name: "김서환", newGrade: 3, newClass: 6, newNum: 2, oldGrade: 2, oldClass: 6, oldNum: 4 },
    { name: "김유린", newGrade: 3, newClass: 6, newNum: 3, oldGrade: 2, oldClass: 5, oldNum: 2 },
    { name: "박지웅", newGrade: 3, newClass: 6, newNum: 4, oldGrade: 2, oldClass: 5, oldNum: 5 },
    { name: "박지헌", newGrade: 3, newClass: 6, newNum: 5, oldGrade: 2, oldClass: 6, oldNum: 9 },
    { name: "박현희", newGrade: 3, newClass: 6, newNum: 6, oldGrade: 2, oldClass: 5, oldNum: 6 },
    { name: "배지영", newGrade: 3, newClass: 6, newNum: 7, oldGrade: 2, oldClass: 6, oldNum: 11 },
    { name: "송지성", newGrade: 3, newClass: 6, newNum: 8, oldGrade: 2, oldClass: 5, oldNum: 8 },
    { name: "이동호", newGrade: 3, newClass: 6, newNum: 9, oldGrade: 2, oldClass: 5, oldNum: 9 },
    { name: "이승준", newGrade: 3, newClass: 6, newNum: 10, oldGrade: 2, oldClass: 5, oldNum: 19 },
    { name: "이용재", newGrade: 3, newClass: 6, newNum: 11, oldGrade: 2, oldClass: 5, oldNum: 10 },
    { name: "이한결", newGrade: 3, newClass: 6, newNum: 12, oldGrade: 2, oldClass: 5, oldNum: 13 },
    { name: "이희성", newGrade: 3, newClass: 6, newNum: 13, oldGrade: 2, oldClass: 6, oldNum: 15 },
    { name: "전민지", newGrade: 3, newClass: 6, newNum: 14, oldGrade: 2, oldClass: 5, oldNum: 14 },
    { name: "조한승", newGrade: 3, newClass: 6, newNum: 15, oldGrade: 2, oldClass: 5, oldNum: 16 },
    { name: "차주원", newGrade: 3, newClass: 6, newNum: 16, oldGrade: 2, oldClass: 5, oldNum: 17 },
    { name: "최서준", newGrade: 3, newClass: 6, newNum: 17, oldGrade: 2, oldClass: 6, oldNum: 18 }
];

async function promoteStudents() {
    console.log("🚀 2026학년도 3학년 진급 처리 시작...");

    let promotedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const item of promotionData) {
        try {
            const oldId = `${item.oldGrade}${item.oldClass}${String(item.oldNum).padStart(2, '0')}`;
            const newId = `${item.newGrade}${item.newClass}${String(item.newNum).padStart(2, '0')}`;

            // 명단에서 학생 찾기 (이름과 구 학번 기준)
            const { data: student, error: fetchError } = await supabase
                .from('students')
                .select('pid, name, student_id')
                .eq('student_id', oldId)
                .eq('academic_year', 2025)
                .single();

            if (fetchError || !student) {
                console.warn(`⚠️ 학생 못찾음: ${item.name} (예상 학번: ${oldId})`);
                notFoundCount++;
                continue;
            }

            // 진급 정보 업데이트 (학년도, 새 학번, 학급 정보)
            const { error: updateError } = await supabase
                .from('students')
                .update({
                    academic_year: 2026,
                    student_id: newId,
                    class_info: `${item.newGrade}-${item.newClass}`,
                    updated_at: new Date().toISOString()
                })
                .eq('pid', student.pid);

            if (updateError) throw updateError;

            console.log(`✅ 진급 완료: ${item.name} (${oldId} -> ${newId})`);
            promotedCount++;

        } catch (e) {
            console.error(`❌ 오류 발생 (${item.name}):`, e.message);
            errorCount++;
        }
    }

    console.log(`\n✨ [진급 처리 결과]`);
    console.log(`- 성공: ${promotedCount}명`);
    console.log(`- 미매칭: ${notFoundCount}명`);
    console.log(`- 에러: ${errorCount}명`);
}

promoteStudents();
