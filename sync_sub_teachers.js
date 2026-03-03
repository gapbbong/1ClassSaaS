import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const teacherUpdates = {
    "daegal96@kakao.com": ["신승현", "010-9094-6599"],
    "eunioioi@naver.com": ["김정은", "010-5880-4184"],
    "bbo_yaa_@naver.com": ["김보윤", "010-9703-3313"],
    "assaree0306@naver.com": ["최지은", "010-2769-0306"],
    "slalee@kse.hs.kr": ["이슬아", "010-5516-9138"],
    "jh850324@naver.com": ["전지훈", "010-4515-1898"],
    "kkoma0911@kse.hs.kr": ["최현정", "010-2435-9360"],
    "unknown1@daum.net": ["김덕원", "010-4874-8654"],
    "duo0083@Nate.com": ["박창우", "010-9746-0083"],
    "kimwh00@nate.com": ["김웅환", "010-2569-7404"],
    "lkm9912@hanmail.net": ["김나경", "010-5755-3647"],
    "lsskor@nate.com": ["이상수", "010-2323-1393"],
    "royals@daum.net": ["이관태", "010-7253-4752"],
    "ssonagi0721@naver.com": ["손주희", "010-9978-5181"],
    "kbJseeun@naver.com": ["김변정", "010-8802-0509"],
    "okcosi@hanmail.net": ["이강정", "010-5571-6290"],
    "hamitgif@hanmail.net": ["하미경", "010-4551-8110"],
    "sodls2156@naver.com": ["박해인", "010-5198-3985"],
    "dhmh7656@naver.com": ["김미희", "010-7656-5427"],
    "flavorhee@naver.com": ["박경희", "010-4569-4280"]
};

(async () => {
    console.log("🛠️ 부담임 선생님 연락처 및 성명 정정을 시작합니다...");

    let updateCount = 0;
    for (const [email, [name, phone]] of Object.entries(teacherUpdates)) {
        const { error } = await supabase
            .from('teachers')
            .update({ name, phone })
            .eq('email', email);

        if (error) {
            console.error(`❌ 업데이트 실패 (${email}):`, error.message);
        } else {
            console.log(`✅ 업데이트 완료: ${name} (${email}) - ${phone}`);
            updateCount++;
        }
    }

    console.log(`\n🎉 총 ${updateCount}명의 정보가 정상적으로 교정되었습니다.`);
})();
