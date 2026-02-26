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

// 이미지 분석을 기반으로 한 2026학년도 3학년 명단 정밀 데이터
const students3rdGrade2026 = [
    // 3-1반
    { name: "김현수", classNum: 1, num: 1 }, { name: "남강현", classNum: 1, num: 2 }, { name: "박영재", classNum: 1, num: 3 }, { name: "박우주", classNum: 1, num: 4 }, { name: "박태웅", classNum: 1, num: 5 }, { name: "백건우", classNum: 1, num: 6 }, { name: "심호영", classNum: 1, num: 7 }, { name: "이우성", classNum: 1, num: 8 }, { name: "이지백", classNum: 1, num: 9 }, { name: "정규민", classNum: 1, num: 10 }, { name: "진정현", classNum: 1, num: 11 }, { name: "최진혁", classNum: 1, num: 12 },
    // 3-2반
    { name: "김산", classNum: 2, num: 1 }, { name: "김시준", classNum: 2, num: 2 }, { name: "김지현", classNum: 2, num: 3 }, { name: "김진헌", classNum: 2, num: 4 }, { name: "김태원", classNum: 2, num: 5 }, { name: "김하울", classNum: 2, num: 6 }, { name: "김하진", classNum: 2, num: 7 }, { name: "문채린", classNum: 2, num: 8 }, { name: "박고영", classNum: 2, num: 9 }, { name: "박성규", classNum: 2, num: 10 }, { name: "백은찬", classNum: 2, num: 11 }, { name: "백승준", classNum: 2, num: 12 }, { name: "손세준", classNum: 2, num: 13 }, { name: "이드림", classNum: 2, num: 14 }, { name: "이영준", classNum: 2, num: 15 }, { name: "이재용", classNum: 2, num: 16 }, { name: "이지현", classNum: 2, num: 17 }, { name: "정다은", classNum: 2, num: 18 }, { name: "정원석", classNum: 2, num: 19 },
    // 3-3반
    { name: "HAN PANG WEN", classNum: 3, num: 1 }, { name: "김범석", classNum: 3, num: 2 }, { name: "김시훈", classNum: 3, num: 3 }, { name: "김아진", classNum: 3, num: 4 }, { name: "김현준", classNum: 3, num: 5 }, { name: "문승민", classNum: 3, num: 6 }, { name: "박동현", classNum: 3, num: 7 }, { name: "박준배", classNum: 3, num: 8 }, { name: "손민영", classNum: 3, num: 9 }, { name: "여중혁", classNum: 3, num: 10 }, { name: "우수영", classNum: 3, num: 11 }, { name: "이준서", classNum: 3, num: 12 }, { name: "장우진", classNum: 3, num: 13 }, { name: "정원희", classNum: 3, num: 14 }, { name: "최강", classNum: 3, num: 15 },
    // 3-4반
    { name: "강태민", classNum: 4, num: 1 }, { name: "강현", classNum: 4, num: 2 }, { name: "권민준", classNum: 4, num: 3 }, { name: "김서진", classNum: 4, num: 4 }, { name: "김서윤", classNum: 4, num: 5 }, { name: "남한진", classNum: 4, num: 6 }, { name: "노민구", classNum: 4, num: 7 }, { name: "박성혁", classNum: 4, num: 8 }, { name: "박승호", classNum: 4, num: 9 }, { name: "박준우", classNum: 4, num: 10 }, { name: "박준휘", classNum: 4, num: 11 }, { name: "송유찬", classNum: 4, num: 12 }, { name: "심재권", classNum: 4, num: 13 }, { name: "안동식", classNum: 4, num: 14 }, { name: "위성현", classNum: 4, num: 15 }, { name: "이용훈", classNum: 4, num: 16 }, { name: "임도현", classNum: 4, num: 17 }, { name: "지유찬", classNum: 4, num: 18 }, { name: "한지민", classNum: 4, num: 19 }, { name: "현종호", classNum: 4, num: 20 },
    // 3-5반
    { name: "강서진", classNum: 5, num: 1 }, { name: "김주찬", classNum: 5, num: 2 }, { name: "김준우", classNum: 5, num: 3 }, { name: "박건희", classNum: 5, num: 4 }, { name: "박진우", classNum: 5, num: 5 }, { name: "박태운", classNum: 5, num: 6 }, { name: "박지민", classNum: 5, num: 7 }, { name: "송시경", classNum: 5, num: 8 }, { name: "심규민", classNum: 5, num: 9 }, { name: "양지훈", classNum: 5, num: 10 }, { name: "이다훈", classNum: 5, num: 11 }, { name: "이승훈", classNum: 5, num: 12 }, { name: "이지호", classNum: 5, num: 13 }, { name: "진도현", classNum: 5, num: 14 }, { name: "최나윤", classNum: 5, num: 15 }, { name: "최민호", classNum: 5, num: 16 }, { name: "황지현", classNum: 5, num: 17 },
    // 3-6반
    { name: "강지희", classNum: 6, num: 1 }, { name: "김서환", classNum: 6, num: 2 }, { name: "김유빈", classNum: 6, num: 3 }, { name: "노시강", classNum: 6, num: 4 }, { name: "노진연", classNum: 6, num: 5 }, { name: "박민희", classNum: 6, num: 6 }, { name: "배지우", classNum: 6, num: 7 }, { name: "손현우", classNum: 6, num: 8 }, { name: "이동호", classNum: 6, num: 9 }, { name: "이스호", classNum: 6, num: 10 }, { name: "이용재", classNum: 6, num: 11 }, { name: "이태운", classNum: 6, num: 12 }, { name: "이태성", classNum: 6, num: 13 }, { name: "전민지", classNum: 6, num: 14 }, { name: "조현중", classNum: 6, num: 15 }, { name: "차웅일", classNum: 6, num: 16 }, { name: "최세정", classNum: 6, num: 17 }
];

async function fix3rdGradePerfectly() {
    console.log("🚀 [정밀 복구] 2026학년도 3학년 명단 수동 동기화 시작...");

    try {
        // 1. 먼저 2026학년도 3학년이라고 되어 있는 모든 데이터를 리셋 (active로 일단 다 돌리기)
        const { error: resetError } = await supabase
            .from('students')
            .update({ status: 'active', academic_year: 2026 })
            .ilike('student_id', '3%');

        if (resetError) throw resetError;
        console.log("✅ 3학년(3XXXX) 데이터 기본 상태를 Active로 일시 리셋 완료.");

        // 2. 이미지 기반 명단과 실제 DB 데이터 매칭 및 업데이트
        for (const s of students3rdGrade2026) {
            const newId = `3${s.classNum}${String(s.num).padStart(2, '0')}`;

            // 이름과 유사 학번(3XXXX)으로 검색
            const { data: match, error: matchError } = await supabase
                .from('students')
                .select('pid, name, student_id')
                .eq('name', s.name)
                .ilike('student_id', '3%')
                .limit(1);

            if (matchError || !match || match.length === 0) {
                console.warn(`⚠️ 매칭 실패: ${s.name} (3-${s.classNum}-${s.num})`);
                continue;
            }

            const target = match[0];
            const { error: updateError } = await supabase
                .from('students')
                .update({
                    student_id: newId,
                    class_info: `3-${s.classNum}`,
                    status: 'active',
                    academic_year: 2026
                })
                .eq('pid', target.pid);

            if (updateError) {
                console.error(`❌ 업데이트 실패 (${s.name}):`, updateError.message);
            } else {
                console.log(`✅ [3-${s.classNum}-${s.num}] ${s.name} 복구 완료.`);
            }
        }

        // 3. 2026학년도 명단에 포함되지 않은 3학년 학번(작년 3학년 = 올해 졸업생)을 다시 졸업 처리
        console.log("\n🎓 졸업생(작년 3학년) 최종 아카이브 작업 중...");

        // 현재 2026학년도 데이터 중 명단(이름 리스트)에 포함되지 않은 사람 찾기
        const nameList = students3rdGrade2026.map(s => s.name);
        const { data: others, error: fetchError } = await supabase
            .from('students')
            .select('pid, name, student_id')
            .eq('academic_year', 2026)
            .ilike('student_id', '3%');

        if (!fetchError && others) {
            const graduates = others.filter(o => !nameList.includes(o.name));
            console.log(`📉 실제 졸업생으로 판명된 ${graduates.length}명 처리 중...`);

            for (const g of graduates) {
                await supabase
                    .from('students')
                    .update({ status: 'graduated', academic_year: 2025 })
                    .eq('pid', g.pid);
            }
        }

        console.log("\n✨ 2026학년도 3학년 명단 정밀 복구가 완료되었습니다.");

    } catch (e) {
        console.error("❌ 정밀 복구 중 오류 발생:", e.message);
    }
}

fix3rdGradePerfectly();
