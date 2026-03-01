import puppeteer from 'puppeteer';

(async () => {
    console.log("🚀 기초조사서 자동 입력 테스트 시작...");
    const browser = await puppeteer.launch({
        headless: false, // 사용자도 폼 채워지는 화면을 볼 수 있게 함
        defaultViewport: null,
        args: ['--window-size=1200,800']
    });

    try {
        const page = await browser.newPage();
        await page.goto('http://localhost:5173/survay1class/index.html', { waitUntil: 'networkidle0' });

        console.log("1. 본인 확인 단계");
        await page.type('#student-num', '2401'); // 테스트용 학번 2401
        await page.click('#btn-verify');

        // 조회성공 버튼 대기
        await page.waitForSelector('#btn-start', { visible: true, timeout: 5000 });
        console.log("✅ 학번 조회 성공, 설문 시작!");
        await page.click('#btn-start');

        // 설문 폼 나타날 때까지 대기
        await page.waitForSelector('#survey-form', { visible: true });

        console.log("2. 폼 자동 입력 중...");
        // 복잡한 폼 입력을 evaluate 내에서 진행
        await page.evaluate(() => {
            // 주소 필드는 readonly라 자바스크립트로 강제 입력
            document.getElementById('zip-code').value = '12345';
            document.getElementById('address-input').value = '부산광역시 남구 테스트동 123';
            document.getElementById('detail-address-input').value = '테스트아파트 101동 101호';

            // 필수항목들 채우기
            function setValue(selector, val) {
                const el = document.querySelector(selector);
                if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
            }

            setValue('input[name="학생폰"]', '010-1234-5678');
            setValue('select[name="주보호자관계"]', '부');
            setValue('input[name="주보호자연락처"]', '010-9876-5432');
            setValue('select[name="보조보호자관계"]', '모');
            setValue('input[name="보조보호자연락처"]', '010-1111-2222');
            setValue('select[name="주연락대상"]', '아버지');
            setValue('select[name="주상담대상"]', '어머니');
            setValue('select[name="주보호자친밀도"]', '5');
            setValue('select[name="보조보호자친밀도"]', '5');

            // 체크박스 처리
            const fatherCheck = document.querySelector('input[name="거주가족"][value="아버지"]');
            if (fatherCheck) { fatherCheck.checked = true; fatherCheck.dispatchEvent(new Event('change', { bubbles: true })); }

            setValue('select[name="성별"]', '남');
            setValue('input[name="출신중"]', '대연중');
            setValue('input[name="중학교성적"]', '30');
            setValue('select[name="졸업후진로"]', '진학');
            setValue('input[name="나의꿈"]', '개발자');
            setValue('input[name="취미"]', '독서');
            setValue('input[name="특기"]', '코딩');
            setValue('input[name="좋아하는 음식"]', '피자');
            setValue('input[name="싫어하는 음식"]', '오이');
            setValue('input[name="잠드는 시간"]', '밤 12시');
            setValue('input[name="수면시간"]', '7시간');
            setValue('input[name="나의장점"]', '성실함');
            setValue('input[name="친한친구"]', '김친구');
            setValue('input[name="MBTI"]', 'INTJ');
            setValue('input[name="인스타 id"]', '@test_id');
            setValue('select[name="혈액형"]', 'A');
            setValue('input[name="알레르기"]', '없음');
            setValue('textarea[name="건강특이사항"]', '없음');

            setValue('#setup-pw', '1234');
            setValue('#setup-pw-confirm', '1234');

            const privacy = document.getElementById('privacy-consent');
            if (privacy) { privacy.checked = true; privacy.dispatchEvent(new Event('change', { bubbles: true })); }
        });

        console.log("3. 제출 가능 상태로 변경 대기 중 (validation)...");
        // 주기적 체크 로직(setInterval)이 돌아가고 버튼 활성화되기를 기다림
        await page.waitForFunction(() => {
            const btn = document.getElementById('btn-submit');
            return btn && btn.disabled === false;
        }, { timeout: 10000 });

        console.log("✅ 유효성 검사 통과, 1차 제출 버튼 클릭");
        await page.click('#btn-submit');

        // 최종 확인 모달 뜰 때까지 대기
        await page.waitForSelector('#btn-modal-confirm', { visible: true, timeout: 5000 });
        console.log("4. 최종 확인 창 표시됨. 정보 전송 시작...");
        await page.click('#btn-modal-confirm');

        // '제출이 완료되었습니다' 화면 대기
        await page.waitForSelector('#step-done:not(.hidden)', { timeout: 10000 });
        console.log("🎉 기초조사서 제출 테스트 완벽하게 성공했습니다!");

        // 성공 메세지를 보기 위해 3초 대기
        await new Promise(r => setTimeout(r, 3000));

    } catch (err) {
        console.error("❌ 테스트 도중 오류 발생:", err);
    } finally {
        await browser.close();
    }
})();
