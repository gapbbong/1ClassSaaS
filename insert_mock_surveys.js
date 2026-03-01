import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const MOCK_SURVEY_DATA = {
    "학번": "", // 덮어씌움
    "이름": "", // 덮어씌움
    "학적": "재학",
    "학생폰": "010-1111-2222",
    "집주소": "부산광역시 테스트구 테스트동",
    "주보호자관계": "부",
    "주보호자연락처": "010-3333-4444",
    "보조보호자관계": "모",
    "주연락대상": "아버지",
    "주상담대상": "어머니",
    "거주가족": "아버지, 어머니",
    "주보호자친밀도": "5",
    "보조보호자친밀도": "4",
    "성별": "남",
    "출신중": "테스트중",
    "중학교성적": "50",
    "졸업후진로": "진학",
    "나의꿈": "테스트 엔지니어",
    "취미": "독서",
    "특기": "운동",
    "좋아하는 음식": "피자",
    "싫어하는 음식": "오이",
    "잠드는 시간": "밤 12시",
    "수면시간": "7시간",
    "나의장점": "성실함",
    "친한친구": "없음",
    "MBTI": "ENTJ",
    "혈액형": "A",
    "알레르기": "없음",
    "건강특이사항": "없음",
    "비밀번호": "1234"
};

async function insertMockSurveys() {
    console.log("🚀 테스트용 학생 기초조사서 생성 시작...");

    try {
        // 1. 2026학년도 전체 학생 가져오기
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('pid, student_id, name, class_info')
            .eq('academic_year', 2026);

        if (studentError) throw studentError;

        if (!students || students.length === 0) {
            console.log("❌ 2026학년도 학생 데이터가 없습니다.");
            return;
        }

        // 2. 이미 설문을 제출한 학생 제외하고 미제출 학생 중에서 11명 랜덤 선택
        const { data: existingSurveys } = await supabase.from('surveys').select('student_pid');
        const submittedPids = new Set(existingSurveys.map(s => s.student_pid));

        let availableStudents = students.filter(s => !submittedPids.has(s.pid));

        // 1~3학년 골고루 들어가게 섞기
        availableStudents.sort(() => 0.5 - Math.random());

        const targetStudents = availableStudents.slice(0, 11);

        if (targetStudents.length === 0) {
            console.log("❌ 미제출 학생이 남아있지 않습니다.");
            return;
        }

        console.log(`✅ 선택된 학생 ${targetStudents.length}명 대기 중... 반별 분포 확인`);
        const gradeStats = {};
        targetStudents.forEach(st => {
            if (!gradeStats[st.class_info]) gradeStats[st.class_info] = 0;
            gradeStats[st.class_info]++;
        });
        console.table(gradeStats);

        // 3. 설문 데이터 구성 및 삽입
        const surveysToInsert = targetStudents.map(st => {
            const surveyData = { ...MOCK_SURVEY_DATA };
            surveyData["학번"] = st.student_id;
            surveyData["이름"] = st.name;

            return {
                student_pid: st.pid,
                data: surveyData
            };
        });

        const { error: insertError } = await supabase
            .from('surveys')
            .insert(surveysToInsert);

        if (insertError) throw insertError;

        console.log("\n🎉 성공적으로 11명의 테스트 기초조사서가 입력되었습니다!");
        console.log("이제 [자동 분석 시작] 버튼을 누르면 이 학생들이 현황판에서 처리되는 것을 볼 수 있습니다.");

    } catch (e) {
        console.error("❌ 처리 중 오류 발생:", e);
    }
}

insertMockSurveys();
