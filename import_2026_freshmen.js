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

// 2026학년도 1학년 신입생 명단 (이미지 분석 결과)
const freshmanData = [
    // 1-1반 (IOT전기과)
    { name: "강찬우", grade: 1, classNum: 1, num: 1 },
    { name: "강길한", grade: 1, classNum: 1, num: 2 },
    { name: "강태우", grade: 1, classNum: 1, num: 3 },
    { name: "김규빈", grade: 1, classNum: 1, num: 4 },
    { name: "김도영", grade: 1, classNum: 1, num: 5 },
    { name: "김동혁", grade: 1, classNum: 1, num: 6 },
    { name: "김선제", grade: 1, classNum: 1, num: 7 },
    { name: "김한결", grade: 1, classNum: 1, num: 8 },
    { name: "박제준", grade: 1, classNum: 1, num: 9 },
    { name: "박진혁", grade: 1, classNum: 1, num: 10 },
    { name: "서민준", grade: 1, classNum: 1, num: 11 },
    { name: "송규병", grade: 1, classNum: 1, num: 12 },
    { name: "양동표", grade: 1, classNum: 1, num: 13 },
    { name: "이민호", grade: 1, classNum: 1, num: 14 },
    { name: "이시윤", grade: 1, classNum: 1, num: 15 },
    { name: "이준", grade: 1, classNum: 1, num: 16 },
    { name: "정성현", grade: 1, classNum: 1, num: 17 },
    { name: "조현준", grade: 1, classNum: 1, num: 18 },
    { name: "하태우", grade: 1, classNum: 1, num: 19 },
    { name: "한경민", grade: 1, classNum: 1, num: 20 },
    { name: "한민수", grade: 1, classNum: 1, num: 21 },
    { name: "홍우주", grade: 1, classNum: 1, num: 22 },

    // 1-2반 (IOT전기과)
    { name: "김대현", grade: 1, classNum: 2, num: 1 },
    { name: "김도윤", grade: 1, classNum: 2, num: 2 },
    { name: "김도현", grade: 1, classNum: 2, num: 3 },
    { name: "김범수", grade: 1, classNum: 2, num: 4 },
    { name: "김사미", grade: 1, classNum: 2, num: 5 },
    { name: "김태윤", grade: 1, classNum: 2, num: 6 },
    { name: "김태준", grade: 1, classNum: 2, num: 7 },
    { name: "김현수", grade: 1, classNum: 2, num: 8 },
    { name: "박태원", grade: 1, classNum: 2, num: 9 },
    { name: "성태진", grade: 1, classNum: 2, num: 10 },
    { name: "송제민", grade: 1, classNum: 2, num: 11 },
    { name: "윤도연", grade: 1, classNum: 2, num: 12 },
    { name: "윤솔우", grade: 1, classNum: 2, num: 13 },
    { name: "이동민", grade: 1, classNum: 2, num: 14 },
    { name: "이윤건", grade: 1, classNum: 2, num: 15 },
    { name: "이정우", grade: 1, classNum: 2, num: 16 },
    { name: "장태민", grade: 1, classNum: 2, num: 17 },
    { name: "전유찬", grade: 1, classNum: 2, num: 18 },
    { name: "전정빈", grade: 1, classNum: 2, num: 19 },
    { name: "최수현", grade: 1, classNum: 2, num: 20 },
    { name: "최예성", grade: 1, classNum: 2, num: 21 },
    { name: "최찬휘", grade: 1, classNum: 2, num: 22 },

    // 1-3반 (IOT전기과)
    { name: "강재명", grade: 1, classNum: 3, num: 1 },
    { name: "강준협", grade: 1, classNum: 3, num: 2 },
    { name: "김대현", grade: 1, classNum: 3, num: 3 },
    { name: "김은호", grade: 1, classNum: 3, num: 4 },
    { name: "김인혜", grade: 1, classNum: 3, num: 5 },
    { name: "도시우", grade: 1, classNum: 3, num: 6 },
    { name: "박민수", grade: 1, classNum: 3, num: 7 },
    { name: "박정후", grade: 1, classNum: 3, num: 8 },
    { name: "방민수", grade: 1, classNum: 3, num: 9 },
    { name: "백창민", grade: 1, classNum: 3, num: 10 },
    { name: "서석현", grade: 1, classNum: 3, num: 11 },
    { name: "손원호", grade: 1, classNum: 3, num: 12 },
    { name: "엄주환", grade: 1, classNum: 3, num: 13 },
    { name: "유하나", grade: 1, classNum: 3, num: 14 },
    { name: "윤가온", grade: 1, classNum: 3, num: 15 },
    { name: "이승민", grade: 1, classNum: 3, num: 16 },
    { name: "이인성", grade: 1, classNum: 3, num: 17 },
    { name: "장범수", grade: 1, classNum: 3, num: 18 },
    { name: "장성빈", grade: 1, classNum: 3, num: 19 },
    { name: "장제민", grade: 1, classNum: 3, num: 20 },
    { name: "주유찬", grade: 1, classNum: 3, num: 21 },
    { name: "지시현", grade: 1, classNum: 3, num: 22 },

    // 1-4반 (게임콘텐츠과)
    { name: "LUO JIALIAN G", grade: 1, classNum: 4, num: 1 },
    { name: "강명찬", grade: 1, classNum: 4, num: 2 },
    { name: "강지윤", grade: 1, classNum: 4, num: 3 },
    { name: "강제훈", grade: 1, classNum: 4, num: 4 },
    { name: "곽근호", grade: 1, classNum: 4, num: 5 },
    { name: "곽태훈", grade: 1, classNum: 4, num: 6 },
    { name: "김민건", grade: 1, classNum: 4, num: 7 },
    { name: "김재용", grade: 1, classNum: 4, num: 8 },
    { name: "김주승", grade: 1, classNum: 4, num: 9 },
    { name: "김태용", grade: 1, classNum: 4, num: 10 },
    { name: "노진우", grade: 1, classNum: 4, num: 11 },
    { name: "민건영", grade: 1, classNum: 4, num: 12 },
    { name: "박하음", grade: 1, classNum: 4, num: 13 },
    { name: "박희진", grade: 1, classNum: 4, num: 14 },
    { name: "백하성", grade: 1, classNum: 4, num: 15 },
    { name: "송한결", grade: 1, classNum: 4, num: 16 },
    { name: "어준호", grade: 1, classNum: 4, num: 17 },
    { name: "이서우", grade: 1, classNum: 4, num: 18 },
    { name: "이선욱", grade: 1, classNum: 4, num: 19 },
    { name: "전우현", grade: 1, classNum: 4, num: 20 },
    { name: "정세연", grade: 1, classNum: 4, num: 21 },
    { name: "채윤형", grade: 1, classNum: 4, num: 22 },
    { name: "최수빈", grade: 1, classNum: 4, num: 23 },

    // 1-5반 (게임콘텐츠과)
    { name: "GURTA FZZAT", grade: 1, classNum: 5, num: 1 },
    { name: "ROBI FUR JUNE SUMAI NOG", grade: 1, classNum: 5, num: 2 },
    { name: "강재혁", grade: 1, classNum: 5, num: 3 },
    { name: "고동혁", grade: 1, classNum: 5, num: 4 },
    { name: "구현우", grade: 1, classNum: 5, num: 5 },
    { name: "김태영", grade: 1, classNum: 5, num: 6 },
    { name: "박나래", grade: 1, classNum: 5, num: 7 },
    { name: "김성우", grade: 1, classNum: 5, num: 8 },
    { name: "나태오", grade: 1, classNum: 5, num: 9 },
    { name: "박예빈", grade: 1, classNum: 5, num: 10 },
    { name: "박웅", grade: 1, classNum: 5, num: 11 },
    { name: "신재겸", grade: 1, classNum: 5, num: 12 },
    { name: "나동희", grade: 1, classNum: 5, num: 13 },
    { name: "이민우", grade: 1, classNum: 5, num: 14 },
    { name: "임수빈", grade: 1, classNum: 5, num: 15 },
    { name: "장조율", grade: 1, classNum: 5, num: 16 },
    { name: "전예찬", grade: 1, classNum: 5, num: 17 },
    { name: "정혜음", grade: 1, classNum: 5, num: 18 },
    { name: "조제민", grade: 1, classNum: 5, num: 19 },
    { name: "주현우", grade: 1, classNum: 5, num: 20 },
    { name: "최지혁", grade: 1, classNum: 5, num: 21 },
    { name: "양수범", grade: 1, classNum: 5, num: 22 },

    // 1-6반 (게임콘텐츠과)
    { name: "EBRA HIMS LAV", grade: 1, classNum: 6, num: 1 },
    { name: "고성혁", grade: 1, classNum: 6, num: 2 },
    { name: "김서원", grade: 1, classNum: 6, num: 3 },
    { name: "김성재", grade: 1, classNum: 6, num: 4 },
    { name: "김재환", grade: 1, classNum: 6, num: 5 },
    { name: "박서서", grade: 1, classNum: 6, num: 6 },
    { name: "박태규", grade: 1, classNum: 6, num: 7 },
    { name: "배연우", grade: 1, classNum: 6, num: 8 },
    { name: "유범안", grade: 1, classNum: 6, num: 9 },
    { name: "윤강현", grade: 1, classNum: 6, num: 10 },
    { name: "박지호", grade: 1, classNum: 6, num: 11 },
    { name: "사성현", grade: 1, classNum: 6, num: 12 },
    { name: "신현재", grade: 1, classNum: 6, num: 13 },
    { name: "안상준", grade: 1, classNum: 6, num: 14 },
    { name: "오승엽", grade: 1, classNum: 6, num: 15 },
    { name: "유성문", grade: 1, classNum: 6, num: 16 },
    { name: "윤서연", grade: 1, classNum: 6, num: 17 },
    { name: "이사후", grade: 1, classNum: 6, num: 18 },
    { name: "장민선", grade: 1, classNum: 6, num: 19 },
    { name: "조현성", grade: 1, classNum: 6, num: 20 },
    { name: "진영관", grade: 1, classNum: 6, num: 21 },
    { name: "채지안", grade: 1, classNum: 6, num: 22 }
];

async function importFreshmen() {
    console.log("🚀 2026학년도 1학년 신입생 등록 시작...");

    const insertData = freshmanData.map(item => ({
        student_id: `${item.grade}${item.classNum}${String(item.num).padStart(2, '0')}`,
        name: item.name,
        academic_year: 2026,
        class_info: `${item.grade}-${item.classNum}`,
        status: 'active'
    }));

    try {
        const { data, error } = await supabase
            .from('students')
            .insert(insertData);

        if (error) throw error;

        console.log(`✅ 신입생 ${insertData.length}명 등록 완료!`);

    } catch (e) {
        console.error("❌ 등록 중 오류 발생:", e.message);
    }
}

importFreshmen();
