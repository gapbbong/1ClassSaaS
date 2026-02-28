import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const classInfo = [
    { grade: 1, class: 1, homeroom: "하미경", homeroomPhone: "010-4551-8110", sub: "김태경", subPhone: "010-7619-3231" },
    { grade: 1, class: 2, homeroom: "최현정", homeroomPhone: "010-2435-9360", sub: "이상수", subPhone: "010-2323-1393" },
    { grade: 1, class: 3, homeroom: "전지훈", homeroomPhone: "010-4515-1898", sub: "구동후", subPhone: "010-4747-5863" },
    { grade: 1, class: 4, homeroom: "이혜영", homeroomPhone: "010-2663-4151", sub: "신승현", subPhone: "010-9094-6599" },
    { grade: 1, class: 5, homeroom: "정혜인", homeroomPhone: "010-8904-1061", sub: "김웅환", subPhone: "010-2569-7404" },
    { grade: 1, class: 6, homeroom: "정유리", homeroomPhone: "010-5759-0564", sub: "김동길", subPhone: "010-2954-1785" },
    { grade: 2, class: 1, homeroom: "황태겸", homeroomPhone: "010-8740-7288", sub: "김선옥", subPhone: "010-5159-1369" },
    { grade: 2, class: 2, homeroom: "정민주", homeroomPhone: "010-2070-1008", sub: "김덕원", subPhone: "010-4874-8654" },
    { grade: 2, class: 3, homeroom: "이민희", homeroomPhone: "010-9152-8979", sub: "이강정", subPhone: "010-5571-6290" },
    { grade: 2, class: 4, homeroom: "백승민", homeroomPhone: "010-6371-1357", sub: "이갑종", subPhone: "010-3736-7153" },
    { grade: 2, class: 5, homeroom: "양지원", homeroomPhone: "010-2578-5055", sub: "정필구", subPhone: "010-9248-9293" },
    { grade: 2, class: 6, homeroom: "권대호", homeroomPhone: "010-5023-9707", sub: "황철현", subPhone: "010-8784-0858" },
    { grade: 3, class: 1, homeroom: "이관태", homeroomPhone: "010-7253-4752", sub: "박성환", subPhone: "010-2929-2882" },
    { grade: 3, class: 2, homeroom: "손주희", homeroomPhone: "010-9978-5181", sub: "박창우", subPhone: "010-9746-0083" },
    { grade: 3, class: 3, homeroom: "손수곤", homeroomPhone: "010-9666-5982", sub: "한현숙", subPhone: "010-9918-0408" },
    { grade: 3, class: 4, homeroom: "이효상", homeroomPhone: "010-4161-0148", sub: "김현희", subPhone: "010-3534-2061" },
    { grade: 3, class: 5, homeroom: "김민경", homeroomPhone: "010-3513-9478", sub: "이경미", subPhone: "010-8312-3256" },
    { grade: 3, class: 6, homeroom: "홍지아", homeroomPhone: "010-2086-2582", sub: "최지은", subPhone: "010-2769-0306" },
];

(async () => {
    console.log("🔄 교사 연락처 복구를 시작합니다...");

    for (const info of classInfo) {
        // 1. 담임 연락처 업데이트
        const { error: hrError } = await supabase
            .from('teachers')
            .update({ phone: info.homeroomPhone })
            .eq('name', info.homeroom)
            .eq('assigned_class', `${info.grade}-${info.class}`);

        if (hrError) console.error(`❌ 담임 업데이트 실패 (${info.homeroom}):`, hrError.message);
        else console.log(`✅ 담임 업데이트 완료: ${info.homeroom}`);

        // 2. 부담임 연락처 업데이트
        if (info.sub && info.sub !== '미정') {
            const { error: subError } = await supabase
                .from('teachers')
                .update({ phone: info.subPhone })
                .eq('name', info.sub)
                .eq('sub_grade', String(info.grade))
                .eq('sub_class', String(info.class));

            if (subError) console.error(`❌ 부담임 업데이트 실패 (${info.sub}):`, subError.message);
            else console.log(`✅ 부담임 업데이트 완료: ${info.sub}`);
        }
    }

    console.log("🎉 교사 연락처 복구 완료!");
})();
