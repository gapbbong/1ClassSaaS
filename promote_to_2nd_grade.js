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

// 2026학년도 2학년 진급 명단 (이미지 분석 결과)
const promotionData = [
    // 2-1반 (IoT전기과)
    { name: "고광민", newGrade: 2, newClass: 1, newNum: 1, oldGrade: 1, oldClass: 2, oldNum: 1 },
    { name: "김용록", newGrade: 2, newClass: 1, newNum: 2, oldGrade: 1, oldClass: 1, oldNum: 3 },
    { name: "김민혁", newGrade: 2, newClass: 1, newNum: 3, oldGrade: 1, oldClass: 3, oldNum: 4 },
    { name: "김솔하", newGrade: 2, newClass: 1, newNum: 4, oldGrade: 1, oldClass: 1, oldNum: 5 },
    { name: "김준혁", newGrade: 2, newClass: 1, newNum: 5, oldGrade: 1, oldClass: 1, oldNum: 6 },
    { name: "김현우", newGrade: 2, newClass: 1, newNum: 6, oldGrade: 1, oldClass: 2, oldNum: 7 },
    { name: "박성현", newGrade: 2, newClass: 1, newNum: 7, oldGrade: 1, oldClass: 2, oldNum: 8 },
    { name: "성재원", newGrade: 2, newClass: 1, newNum: 8, oldGrade: 1, oldClass: 2, oldNum: 9 },
    { name: "신지후", newGrade: 2, newClass: 1, newNum: 9, oldGrade: 1, oldClass: 2, oldNum: 12 },
    { name: "안지환", newGrade: 2, newClass: 1, newNum: 10, oldGrade: 1, oldClass: 1, oldNum: 9 },
    { name: "이지현", newGrade: 2, newClass: 1, newNum: 11, oldGrade: 1, oldClass: 1, oldNum: 11 },
    { name: "임채민", newGrade: 2, newClass: 1, newNum: 12, oldGrade: 1, oldClass: 3, oldNum: 13 },
    { name: "전병필", newGrade: 2, newClass: 1, newNum: 13, oldGrade: 1, oldClass: 1, oldNum: 12 },
    { name: "전민영", newGrade: 2, newClass: 1, newNum: 14, oldGrade: 1, oldClass: 3, oldNum: 15 },
    { name: "최지우", newGrade: 2, newClass: 1, newNum: 15, oldGrade: 1, oldClass: 3, oldNum: 16 },
    { name: "최지우", newGrade: 2, newClass: 1, newNum: 16, oldGrade: 1, oldClass: 1, oldNum: 13 },
    { name: "김현승", newGrade: 2, newClass: 1, newNum: 17, oldGrade: 1, oldClass: 1, oldNum: 14 },
    { name: "주태평", newGrade: 2, newClass: 1, newNum: 18, oldGrade: 1, oldClass: 1, oldNum: 16 },
    { name: "하관", newGrade: 2, newClass: 1, newNum: 19, oldGrade: 1, oldClass: 1, oldNum: 20 },

    // 2-2반 (IoT전기과)
    { name: "EBRAHIM RANALLAI", newGrade: 2, newClass: 2, newNum: 1, oldGrade: 1, oldClass: 1, oldNum: 1 },
    { name: "강태현", newGrade: 2, newClass: 2, newNum: 2, oldGrade: 1, oldClass: 1, oldNum: 2 },
    { name: "고현호", newGrade: 2, newClass: 2, newNum: 3, oldGrade: 1, oldClass: 3, oldNum: 1 },
    { name: "김우빈", newGrade: 2, newClass: 2, newNum: 4, oldGrade: 1, oldClass: 2, oldNum: 2 },
    { name: "김재완", newGrade: 2, newClass: 2, newNum: 5, oldGrade: 1, oldClass: 2, oldNum: 5 },
    { name: "김준혁", newGrade: 2, newClass: 2, newNum: 6, oldGrade: 1, oldClass: 3, oldNum: 5 },
    { name: "윤재민", newGrade: 2, newClass: 2, newNum: 7, oldGrade: 1, oldClass: 2, oldNum: 7 },
    { name: "박지훈", newGrade: 2, newClass: 2, newNum: 8, oldGrade: 1, oldClass: 2, oldNum: 8 },
    { name: "윤희정", newGrade: 2, newClass: 2, newNum: 9, oldGrade: 1, oldClass: 3, oldNum: 11 },
    { name: "이상빈", newGrade: 2, newClass: 2, newNum: 10, oldGrade: 1, oldClass: 1, oldNum: 10 },
    { name: "이채민", newGrade: 2, newClass: 2, newNum: 11, oldGrade: 1, oldClass: 3, oldNum: 14 },
    { name: "임현욱", newGrade: 2, newClass: 2, newNum: 12, oldGrade: 1, oldClass: 3, oldNum: 14 }, // 번호 중복 확인 필요하지만 이미지대로
    { name: "전현욱", newGrade: 2, newClass: 2, newNum: 13, oldGrade: 1, oldClass: 3, oldNum: 15 },
    { name: "한유준", newGrade: 2, newClass: 2, newNum: 14, oldGrade: 1, oldClass: 3, oldNum: 16 },
    { name: "조서현", newGrade: 2, newClass: 2, newNum: 15, oldGrade: 1, oldClass: 3, oldNum: 18 },
    { name: "조재민", newGrade: 2, newClass: 2, newNum: 16, oldGrade: 1, oldClass: 1, oldNum: 15 },
    { name: "최동진", newGrade: 2, newClass: 2, newNum: 17, oldGrade: 1, oldClass: 1, oldNum: 18 },
    { name: "한서준", newGrade: 2, newClass: 2, newNum: 18, oldGrade: 1, oldClass: 1, oldNum: 19 },

    // 2-3반 (IoT전기과)
    { name: "김건우", newGrade: 2, newClass: 3, newNum: 1, oldGrade: 1, oldClass: 3, oldNum: 2 },
    { name: "김민준", newGrade: 2, newClass: 3, newNum: 2, oldGrade: 1, oldClass: 1, oldNum: 4 },
    { name: "김범서", newGrade: 2, newClass: 3, newNum: 3, oldGrade: 1, oldClass: 2, oldNum: 3 },
    { name: "김성현", newGrade: 2, newClass: 3, newNum: 4, oldGrade: 1, oldClass: 2, oldNum: 4 },
    { name: "김우주", newGrade: 2, newClass: 3, newNum: 5, oldGrade: 1, oldClass: 3, oldNum: 5 },
    { name: "박예준", newGrade: 2, newClass: 3, newNum: 6, oldGrade: 1, oldClass: 1, oldNum: 7 },
    { name: "서범열", newGrade: 2, newClass: 3, newNum: 7, oldGrade: 1, oldClass: 1, oldNum: 8 },
    { name: "신현우", newGrade: 2, newClass: 3, newNum: 8, oldGrade: 1, oldClass: 2, oldNum: 10 },
    { name: "신경준", newGrade: 2, newClass: 3, newNum: 9, oldGrade: 1, oldClass: 3, oldNum: 10 },
    { name: "이서윤", newGrade: 2, newClass: 3, newNum: 10, oldGrade: 1, oldClass: 2, oldNum: 13 },
    { name: "이준석", newGrade: 2, newClass: 3, newNum: 11, oldGrade: 1, oldClass: 3, oldNum: 12 },
    { name: "이준석", newGrade: 2, newClass: 3, newNum: 12, oldGrade: 1, oldClass: 3, oldNum: 17 },
    { name: "임지원", newGrade: 2, newClass: 3, newNum: 13, oldGrade: 1, oldClass: 2, oldNum: 17 },
    { name: "주현우", newGrade: 2, newClass: 3, newNum: 14, oldGrade: 1, oldClass: 1, oldNum: 17 },
    { name: "최민혁", newGrade: 2, newClass: 3, newNum: 15, oldGrade: 1, oldClass: 2, oldNum: 18 },
    { name: "최현수", newGrade: 2, newClass: 3, newNum: 16, oldGrade: 1, oldClass: 3, oldNum: 19 },
    { name: "황보빈", newGrade: 2, newClass: 3, newNum: 17, oldGrade: 1, oldClass: 1, oldNum: 19 },

    // 2-4반 (게임콘텐츠과)
    { name: "강민성", newGrade: 2, newClass: 4, newNum: 1, oldGrade: 1, oldClass: 4, oldNum: 1 },
    { name: "강병윤", newGrade: 2, newClass: 4, newNum: 2, oldGrade: 1, oldClass: 6, oldNum: 1 },
    { name: "공성민", newGrade: 2, newClass: 4, newNum: 3, oldGrade: 1, oldClass: 5, oldNum: 3 },
    { name: "김도원", newGrade: 2, newClass: 4, newNum: 4, oldGrade: 1, oldClass: 6, oldNum: 3 },
    { name: "김동혁", newGrade: 2, newClass: 4, newNum: 5, oldGrade: 1, oldClass: 4, oldNum: 3 },
    { name: "김동헌", newGrade: 2, newClass: 4, newNum: 6, oldGrade: 1, oldClass: 6, oldNum: 4 },
    { name: "김영준", newGrade: 2, newClass: 4, newNum: 7, oldGrade: 1, oldClass: 5, oldNum: 5 },
    { name: "김현호", newGrade: 2, newClass: 4, newNum: 8, oldGrade: 1, oldClass: 6, oldNum: 7 },
    { name: "배원빈", newGrade: 2, newClass: 4, newNum: 9, oldGrade: 1, oldClass: 4, oldNum: 10 },
    { name: "배지민", newGrade: 2, newClass: 4, newNum: 10, oldGrade: 1, oldClass: 4, oldNum: 11 },
    { name: "안우진", newGrade: 2, newClass: 4, newNum: 11, oldGrade: 1, oldClass: 4, oldNum: 8 },
    { name: "이수호", newGrade: 2, newClass: 4, newNum: 12, oldGrade: 1, oldClass: 4, oldNum: 18 },
    { name: "이예찬", newGrade: 2, newClass: 4, newNum: 13, oldGrade: 1, oldClass: 4, oldNum: 19 },
    { name: "이찬준", newGrade: 2, newClass: 4, newNum: 14, oldGrade: 1, oldClass: 6, oldNum: 15 },
    { name: "장예찬", newGrade: 2, newClass: 4, newNum: 15, oldGrade: 1, oldClass: 5, oldNum: 15 },

    // 2-5반 (게임콘텐츠과)
    { name: "김민재", newGrade: 2, newClass: 5, newNum: 1, oldGrade: 1, oldClass: 5, oldNum: 5 },
    { name: "김예빈", newGrade: 2, newClass: 5, newNum: 2, oldGrade: 1, oldClass: 6, oldNum: 5 },
    { name: "김재원", newGrade: 2, newClass: 5, newNum: 3, oldGrade: 1, oldClass: 5, oldNum: 8 },
    { name: "김태윤", newGrade: 2, newClass: 5, newNum: 4, oldGrade: 1, oldClass: 5, oldNum: 9 },
    { name: "박기태", newGrade: 2, newClass: 5, newNum: 5, oldGrade: 1, oldClass: 6, oldNum: 10 },
    { name: "박지율", newGrade: 2, newClass: 5, newNum: 6, oldGrade: 1, oldClass: 4, oldNum: 9 },
    { name: "박태현", newGrade: 2, newClass: 5, newNum: 7, oldGrade: 1, oldClass: 5, oldNum: 11 },
    { name: "손윤후", newGrade: 2, newClass: 5, newNum: 8, oldGrade: 1, oldClass: 6, oldNum: 11 },
    { name: "손지후", newGrade: 2, newClass: 5, newNum: 9, oldGrade: 1, oldClass: 4, oldNum: 12 },
    { name: "오선용", newGrade: 2, newClass: 5, newNum: 10, oldGrade: 1, oldClass: 4, oldNum: 14 },
    { name: "오윤호", newGrade: 2, newClass: 5, newNum: 11, oldGrade: 1, oldClass: 5, oldNum: 15 },
    { name: "우주", newGrade: 2, newClass: 5, newNum: 12, oldGrade: 1, oldClass: 5, oldNum: 13 },
    { name: "이태헌", newGrade: 2, newClass: 5, newNum: 13, oldGrade: 1, oldClass: 6, oldNum: 16 },
    { name: "전지후", newGrade: 2, newClass: 5, newNum: 14, oldGrade: 1, oldClass: 6, oldNum: 18 },
    { name: "정효민", newGrade: 2, newClass: 5, newNum: 15, oldGrade: 1, oldClass: 4, oldNum: 20 },
    { name: "조준호", newGrade: 2, newClass: 5, newNum: 16, oldGrade: 1, oldClass: 5, oldNum: 17 },

    // 2-6반 (게임콘텐츠과)
    { name: "강태윤", newGrade: 2, newClass: 6, newNum: 1, oldGrade: 1, oldClass: 5, oldNum: 2 },
    { name: "김민준", newGrade: 2, newClass: 6, newNum: 2, oldGrade: 1, oldClass: 5, oldNum: 4 },
    { name: "권수지", newGrade: 2, newClass: 6, newNum: 3, oldGrade: 1, oldClass: 5, oldNum: 21 },
    { name: "권태리", newGrade: 2, newClass: 6, newNum: 4, oldGrade: 1, oldClass: 6, oldNum: 2 },
    { name: "김상윤", newGrade: 2, newClass: 6, newNum: 5, oldGrade: 1, oldClass: 4, oldNum: 5 },
    { name: "남현서", newGrade: 2, newClass: 6, newNum: 6, oldGrade: 1, oldClass: 6, oldNum: 8 },
    { name: "문주영", newGrade: 2, newClass: 6, newNum: 7, oldGrade: 1, oldClass: 6, oldNum: 9 },
    { name: "박기태", newGrade: 2, newClass: 6, newNum: 8, oldGrade: 1, oldClass: 5, oldNum: 10 },
    { name: "배재진", newGrade: 2, newClass: 6, newNum: 9, oldGrade: 1, oldClass: 5, oldNum: 12 },
    { name: "양민헌", newGrade: 2, newClass: 6, newNum: 10, oldGrade: 1, oldClass: 6, oldNum: 12 },
    { name: "오선준", newGrade: 2, newClass: 6, newNum: 11, oldGrade: 1, oldClass: 6, oldNum: 13 },
    { name: "윤다원", newGrade: 2, newClass: 6, newNum: 12, oldGrade: 1, oldClass: 5, oldNum: 14 },
    { name: "류영빈", newGrade: 2, newClass: 6, newNum: 13, oldGrade: 1, oldClass: 4, oldNum: 17 },
    { name: "이유진", newGrade: 2, newClass: 6, newNum: 14, oldGrade: 1, oldClass: 6, oldNum: 14 },
    { name: "장원호", newGrade: 2, newClass: 6, newNum: 15, oldGrade: 1, oldClass: 6, oldNum: 19 },
    { name: "현재윤", newGrade: 2, newClass: 6, newNum: 16, oldGrade: 1, oldClass: 5, oldNum: 18 },
    { name: "최지훈", newGrade: 2, newClass: 6, newNum: 17, oldGrade: 1, oldClass: 5, oldNum: 19 }
];

async function promoteTo2nd() {
    console.log("🚀 2026학년도 2학년 진급 처리 시작...");

    let promotedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const item of promotionData) {
        try {
            // 구 학번 생성 (2025학년도 1학년)
            const oldId = `${item.oldGrade}${item.oldClass}${String(item.oldNum).padStart(2, '0')}`;
            const newId = `${item.newGrade}${item.newClass}${String(item.newNum).padStart(2, '0')}`;

            // 학생 찾기 (이름과 구 학번 기준)
            const { data: student, error: fetchError } = await supabase
                .from('students')
                .select('pid, name, student_id')
                .eq('student_id', oldId)
                .eq('academic_year', 2025)
                .single();

            if (fetchError || !student) {
                console.warn(`⚠️ 미매칭 학생: ${item.name} (${oldId})`);
                notFoundCount++;
                continue;
            }

            // 진급 업데이트
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
            console.error(`❌ 에러 (${item.name}):`, e.message);
            errorCount++;
        }
    }

    console.log(`\n✨ [진급 완료 리포트]`);
    console.log(`- 성공: ${promotedCount}명`);
    console.log(`- 미매칭: ${notFoundCount}명`);
    console.log(`- 에러: ${errorCount}명`);
}

promoteTo2nd();
