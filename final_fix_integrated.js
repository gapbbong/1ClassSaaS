import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 이전 덤프에서 추출한 이메일-연락처 매핑 (인코딩 우회용)
const emailPhoneMap = {
    "unknown1@daum.net": "010-4874-8654", // 김정원
    "5120ehdvud@naver.com": "010-2929-2882", // 박선영
    "rnehdgn@naver.com": "010-4747-5863", // 구동우
    "jarange@kse.hs.kr": "010-3513-9478", // 김민경
    "janghyt@kse.hs.kr": "010-8713-6255", // 장효윤
    "gapbbong@naver.com": "010-3736-7153", // 이갑종
    "ajshdcg@hanmail.net": "010-2578-5055", // 양지원
    "lhs003410@naver.com": "010-4161-0148", // 이효상
    "monte2002@naver.com": "010-2573-0648", // 김현정
    "namjihyen7@naver.com": "010-2235-5285", // 남지현
    "rotc990@naver.com": "010-4052-9513", // 박창국
    "hyleemay@gmail.com": "010-2663-4151", // 이혜영
    "Jge0808@nate.com": "010-9459-2692", // 정고은
    "mjjoa01@naver.com": "010-2070-1008", // 정민주
    "akarde@naver.com": "010-8646-0980", // 정재열
    "philku@nate.com": "010-9248-9293", // 정필구
    "whduswn4814@naver.com": "010-4960-9846", // 조연주
    "heaven1024@hanmai.net": "010-9918-0408", // 한현숙
    "cheolhyun012@naver.com": "010-8784-0858" // 황철현
};

(async () => {
    console.log("🛠️ 최종 통합 수정을 시작합니다...");

    // 1. 2-1반 정시우 중복 제거 (2115 데이터 확실히 삭제)
    console.log("1. 정시우 중복 제거 시도...");
    const { data: siwoo, error: err1 } = await supabase
        .from('students')
        .select('pid, student_id')
        .eq('academic_year', 2026)
        .eq('class_info', '2-1')
        .eq('name', '정시우');

    if (siwoo && siwoo.length > 1) {
        // 2115 데이터 삭제 (사용자가 명렬을 근거로 중복이라고 함)
        const target = siwoo.find(s => s.student_id === '2115');
        if (target) {
            const { error: delErr } = await supabase.from('students').delete().eq('pid', target.pid);
            if (delErr) console.error("   ❌ 삭제 실패:", delErr.message);
            else console.log("   ✅ 2-1반 정시우(2115) 삭제 완료");
        }
    } else {
        console.log("   이미 정리되었거나 중복이 아닙니다.");
    }

    // 2. 부담임 연락처 복구 (이메일 매칭 기반)
    console.log("\n2. 교사 연락처 복구 시도...");
    let updatedCount = 0;
    for (const [email, phone] of Object.entries(emailPhoneMap)) {
        const { data, error } = await supabase
            .from('teachers')
            .update({ phone: phone })
            .eq('email', email)
            .or('phone.is.null,phone.eq.""');

        if (!error) updatedCount++;
    }
    console.log(`   ✅ 총 ${updatedCount}개 레코드 업데이트 시도 완료.`);

    console.log("\n🎉 모든 정정 작업이 완료되었습니다.");
})();
