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

// 2025학년도 교사 배정 명단 (이미지 분석 결과)
// 형식: { class_info, homeroom_teacher, assistant_teacher }
const assignments2025 = [
    { class_info: "1-1", homeroom: "최희락", assistant: "김태경" },
    { class_info: "1-2", homeroom: "최현정", assistant: "김동길" },
    { class_info: "1-3", homeroom: "전지훈", assistant: "구동후" },
    { class_info: "1-4", homeroom: "이혜영", assistant: "신승현" },
    { class_info: "1-5", homeroom: "정혜인", assistant: "김웅환" },
    { class_info: "1-6", homeroom: "정유리", assistant: "이상수" },
    { class_info: "2-1", homeroom: "황태겸", assistant: "김선옥" },
    { class_info: "2-2", homeroom: "정민주", assistant: "김덕원" },
    { class_info: "2-3", homeroom: "이민희", assistant: "하미경" },
    { class_info: "2-4", homeroom: "백승민", assistant: "이갑종" },
    { class_info: "2-5", homeroom: "양지원", assistant: "정필구" },
    { class_info: "2-6", homeroom: "권대호", assistant: "황철현" },
    { class_info: "3-1", homeroom: "이관태", assistant: "박성환" },
    { class_info: "3-2", homeroom: "손주희", assistant: "박창우" },
    { class_info: "3-3", homeroom: "손수곤", assistant: "한현숙" },
    { class_info: "3-4", homeroom: "이효상", assistant: "김현희" },
    { class_info: "3-5", homeroom: "김민경", assistant: "이경미" },
    { class_info: "3-6", homeroom: "홍지아", assistant: "최지은" }
];

async function syncTeacherHistory2025() {
    console.log("🚀 2025학년도 교사 히스토리 동기화 시작...");

    // 1. 기존 teachers 테이블에서 이메일 매핑 정보 가져오기
    const { data: teacherList, error: fetchError } = await supabase
        .from('teachers')
        .select('email, name');

    if (fetchError) throw fetchError;

    const emailMap = {};
    teacherList.forEach(t => {
        emailMap[t.name] = t.email;
    });

    const historyEntries = [];

    for (const entry of assignments2025) {
        // 담임 추가
        if (emailMap[entry.homeroom]) {
            historyEntries.push({
                academic_year: 2025,
                email: emailMap[entry.homeroom],
                name: entry.homeroom,
                assigned_class: entry.class_info,
                role: 'homeroom_teacher'
            });
        } else {
            console.warn(`⚠️ 이메일 미매칭(담임): ${entry.homeroom}`);
        }

        // 부담임 추가
        if (emailMap[entry.assistant]) {
            historyEntries.push({
                academic_year: 2025,
                email: emailMap[entry.assistant],
                name: entry.assistant,
                assigned_class: entry.class_info,
                role: 'subject_teacher' // 부담임 역할을 subject_teacher로 기록하거나 별도 구분
            });
        } else {
            console.warn(`⚠️ 이메일 미매칭(부담임): ${entry.assistant}`);
        }
    }

    if (historyEntries.length === 0) {
        console.log("❌ 등록할 히스토리 데이터가 없습니다.");
        return;
    }

    // 2. teacher_history 테이블에 삽입
    const { error: insertError } = await supabase
        .from('teacher_history')
        .insert(historyEntries);

    if (insertError) {
        console.error("❌ 히스토리 삽입 실패:", insertError.message);
    } else {
        console.log(`✅ ${historyEntries.length}개의 2025학년도 교사 이력 저장 완료!`);
    }
}

syncTeacherHistory2025();
