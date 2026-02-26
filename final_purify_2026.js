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

// 선생님이 주신 이미지에서 추출한 2026학년도 3학년 "정상 재학생" 전체 명단
const valid3rdGradeNames = [
    // 3-1반
    "김현수", "남강현", "박영재", "박우주", "박태웅", "백건우", "심호영", "이우성", "이지백", "정규민", "진정현", "최진혁",
    // 3-2반
    "김산", "김시준", "김지현", "김진헌", "김태원", "김하울", "김하진", "문채린", "박고영", "박성규", "백은찬", "백승준", "손세준", "이드림", "이영준", "이재용", "이지현", "정다은", "정원석",
    // 3-3반
    "HAN PANG WEN", "김범석", "김시훈", "김아진", "김현준", "문승민", "박동현", "박준배", "손민영", "여중혁", "우수영", "이준서", "장우진", "정원희", "최강",
    // 3-4반
    "강태민", "강현", "권민준", "김서진", "김서윤", "남한진", "노민구", "박성혁", "박승호", "박준우", "박준휘", "송유찬", "심재권", "안동식", "위성현", "이용훈", "임도현", "지유찬", "한지민", "현종호",
    // 3-5반
    "강서진", "김주찬", "김준우", "박건희", "박진우", "박태운", "박지민", "송시경", "심규민", "양지훈", "이다훈", "이승훈", "이지호", "진도현", "최나윤", "최민호", "황지현",
    // 3-6반
    "강지희", "김서환", "김유빈", "노시강", "노진연", "박민희", "배지우", "손현우", "이동호", "이스호", "이용재", "이태운", "이태성", "전민지", "조현중", "차웅일", "최세정"
];

async function finalCleanupAndPurify() {
    console.log("🚀 [최종 정화] 2026학년도 3학년 데이터 정밀 세척 시작...");

    try {
        // 1. 2026학년도 명단 중 3학년 학번(3XXXX)인 학생 전체 가져오기
        const { data: all3rdIn2026, error: fetchError } = await supabase
            .from('students')
            .select('pid, name, student_id, status')
            .eq('academic_year', 2026)
            .ilike('student_id', '3%');

        if (fetchError) throw fetchError;

        console.log(`📊 현재 2026학년도 버킷의 3학년 데이터: ${all3rdIn2026.length}명`);

        let purifyCount = 0;
        let stayCount = 0;

        for (const student of all3rdIn2026) {
            // 이미지 명단에 이름이 있는지 확인
            if (valid3rdGradeNames.includes(student.name)) {
                // 정상 재학생: Status를 active로 확실히 고정
                await supabase
                    .from('students')
                    .update({ status: 'active' })
                    .eq('pid', student.pid);
                stayCount++;
            } else {
                // 유령 학생 (2025 졸업생 등): 2025학년도로 격리하고 graduated 처리
                await supabase
                    .from('students')
                    .update({
                        academic_year: 2025,
                        status: 'graduated'
                    })
                    .eq('pid', student.pid);
                purifyCount++;
                console.log(`🧹 유령 학생 제거: ${student.name} (격리 완료)`);
            }
        }

        console.log(`\n✨ 정화 작업 완료 리포트:`);
        console.log(`- 정상 재학생 유지: ${stayCount}명`);
        console.log(`- 유령 학생(과거 데이터) 격리: ${purifyCount}명`);
        console.log(`\n이제 2026학년도 명단에는 이미지 속 ${stayCount}명의 학생만 정확하게 남게 됩니다.`);

    } catch (e) {
        console.error("❌ 정화 작업 중 오류 발생:", e.message);
    }
}

finalCleanupAndPurify();
