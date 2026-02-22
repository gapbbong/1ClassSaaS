import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const firstNames = ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '주원', '지훈', '건우', '서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '지유', '윤서', '채원'];
const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
const mbtis = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'];
const bloodTypes = ['A', 'B', 'O', 'AB'];
const middleSchools = ['성포중', '안산중', '단원중', '양지중', '해양중', '중앙중', '경수중', '상록중'];
const dreams = ['개발자', '크리에이터', '교사', '경찰관', '소방관', '의사', '건축가', '디자이너', '공무원', '요리사'];

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomPhone() {
    return `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function generateMockData() {
    console.log("3-4반 모의 데이터 생성 시작...");

    for (let i = 1; i <= 20; i++) {
        const studentId = `34${i.toString().padStart(2, '0')}`;
        const name = getRandom(lastNames) + getRandom(firstNames);
        const phone = generateRandomPhone();
        const parentPhone = generateRandomPhone();

        console.log(`[${studentId}] ${name} 데이터 준비 중...`);

        // 1. 학생 테이블 확인 및 삽입/업데이트
        let studentPid;
        const { data: existingStudent, error: sError } = await supabase
            .from('students')
            .select('pid')
            .eq('student_id', studentId)
            .maybeSingle();

        if (existingStudent) {
            studentPid = existingStudent.pid;
            // 업데이트
            await supabase.from('students').update({
                name: name,
                contact: phone,
                parent_contact: parentPhone,
                academic_year: new Date().getFullYear(),
                class_info: '3-4',
                status: 'active'
            }).eq('pid', studentPid);
        } else {
            // 새로 삽입
            const { data: newStudent, error: insertError } = await supabase
                .from('students')
                .insert({
                    student_id: studentId,
                    name: name,
                    contact: phone,
                    parent_contact: parentPhone,
                    academic_year: new Date().getFullYear(),
                    class_info: '3-4',
                    status: 'active'
                })
                .select('pid')
                .single();

            if (insertError) {
                console.error(`학생 ${studentId} 생성 실패:`, insertError);
                continue;
            }
            studentPid = newStudent.pid;
        }

        // 2. 모의 기초조사 데이터 생성
        const surveyData = {
            "학번": studentId,
            "이름": name,
            "학적": "재학",
            "학생폰": phone,
            "집주소": `경기도 안산시 상록구 ${Math.floor(Math.random() * 100) + 1}동 ${Math.floor(Math.random() * 1000) + 1}호`,
            "거주가족": "어머니, 아버지, 형제자매",
            "주보호자관계": getRandom(['부', '모', '조부', '조모']),
            "주보호자연락처": parentPhone,
            "보조보호자관계": getRandom(['모', '부', '없음']),
            "보조보호자연락처": generateRandomPhone(),
            "형제": "1남 1녀 중 첫째",
            "주연락대상": getRandom(['아버지', '어머니']),
            "주상담대상": getRandom(['어머니', '아버지']),
            "주보호자친밀도": Math.floor(Math.random() * 5) + 1,
            "보조보호자친밀도": Math.floor(Math.random() * 5) + 1,
            "다문화여부": "해당없음",
            "반려동물": getRandom(['강아지', '고양이', '없음', '햄스터']),
            "등교수단": getRandom(['도보', '버스', '자전거']),
            "성별": getRandom(['남', '여']),
            "출신중": getRandom(middleSchools),
            "중학교성적": Math.floor(Math.random() * 50) + 50,
            "나의꿈": getRandom(dreams),
            "졸업후진로": getRandom(['진학', '취업']),
            "자신의장점": "성실함, 밝은 성격",
            "자신의단점": "가끔 게으름",
            "최근칭찬": "방청소를 잘 함",
            "1년다짐": "건강하게 학교생활 하기",
            "보건특이점": "없음",
            "특기": "게임, 음악감상",
            "취미": "독서, 영화감상",
            "친한친구": "아직 없음",
            "MBTI": getRandom(mbtis),
            "혈액형": getRandom(bloodTypes),
            "종교": getRandom(['무교', '기독교', '불교', '천주교']),
            "선생님바라는점": "자주 상담해주셨으면 좋겠습니다."
        };

        // 기존 설문 삭제 (안전하게 덮어쓰기 위해)
        await supabase.from('surveys').delete().eq('student_pid', studentPid);

        // 설문 삽입
        const { error: surveyError } = await supabase
            .from('surveys')
            .insert({
                student_pid: studentPid,
                data: surveyData
            });

        if (surveyError) {
            console.error(`설문 데이터 삽입 실패 [${studentId}]:`, surveyError);
        } else {
            console.log(`[${studentId}] ${name} 처리 완료`);
        }
    }

    console.log("✅ 3-4반 모의 데이터 처리가 모두 완료되었습니다!");
}

generateMockData();
