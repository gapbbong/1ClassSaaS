// ✅ Student Survey App JS (v1)

// [중요] 실제 서비스 시에는 선생님의 GAS SCRIPT_URL로 교체 완료해야 함
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3I2_xys75bFOA-59hKyV3kWYoTqh6pMlixpn6M9eI4US88yNE72yvfm2YMPSUA_qoQA/exec";

let currentStudentNum = null;

// DOM 요소
const stepVerify = document.getElementById("step-verify");
const stepSurvey = document.getElementById("step-survey");
const stepDone = document.getElementById("step-done");
const loadingOverlay = document.getElementById("loading-overlay");

const inputNum = document.getElementById("student-num");
const btnVerify = document.getElementById("btn-verify");
const verifyResult = document.getElementById("verify-result");
const displayName = document.getElementById("display-name");
const btnStart = document.getElementById("btn-start");

const surveyForm = document.getElementById("survey-form");

// 로딩 토글
function toggleLoading(show) {
    loadingOverlay.classList.toggle("hidden", !show);
}

// 자동 하이픈 함수
function autoHyphen(value) {
    return value
        .replace(/[^0-9]/g, "")
        .replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`);
}

// 전화번호 입력 이벤트 바인딩
document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener("input", (e) => {
        const hyphenated = autoHyphen(e.target.value);
        if (hyphenated.length <= 13) {
            e.target.value = hyphenated;
        }
    });
});

// 인스타 ID 처리
const instaInput = document.querySelector('input[name="인스타 id"]');
if (instaInput) {
    instaInput.addEventListener("blur", (e) => {
        let val = e.target.value.trim();
        if (val && !val.startsWith("@")) {
            e.target.value = "@" + val;
        }
    });

    // 실시간 검증 (공백 및 한글 방지)
    instaInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^\w.@]/g, "");
    });
}

// 1. 학번 조회
btnVerify.addEventListener("click", async () => {
    const num = inputNum.value.trim();
    if (!num) return alert("학번을 입력해주세요.");

    toggleLoading(true);
    try {
        const response = await fetch(`${SCRIPT_URL}?action=verifyStudent&num=${num}`);
        const data = await response.json();

        if (data.success) {
            displayName.textContent = data.name;
            verifyResult.classList.remove("hidden");
            currentStudentNum = num;
        } else {
            alert("입력하신 학번의 학생을 찾을 수 없습니다.");
            verifyResult.classList.add("hidden");
        }
    } catch (err) {
        console.error(err);
        alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
        toggleLoading(false);
    }
});

// 2. 설문 시작
btnStart.addEventListener("click", () => {
    stepVerify.classList.add("hidden");
    stepSurvey.classList.remove("hidden");
    window.scrollTo(0, 0);
});

// 3. 설문 제출
surveyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const consent = document.getElementById("privacy-consent");
    if (!consent.checked) {
        return alert("개인정보 수집 및 이용에 동의해주셔야 제출이 가능합니다.");
    }

    // 최종 확인용 데이터 추출
    const sPhone = surveyForm.elements['학생폰'].value;
    const addr = surveyForm.elements['집주소'].value;
    const primaryContact = surveyForm.elements['주연락대상'].value || "미지정";

    const confirmMsg = `입력하신 정보를 최종 확인해주세요.\n\n` +
        `📱 학생번호: ${sPhone}\n` +
        `🏠 주소: ${addr}\n` +
        `📞 주요연락: ${primaryContact}\n\n` +
        `이 정보가 맞으면 확인을 눌러주세요.`;

    if (!confirm(confirmMsg)) return;

    toggleLoading(true);

    const formData = new FormData(surveyForm);
    const surveyData = {};
    formData.forEach((value, key) => {
        // 모든 '거주가족' 체크박스 값을 콤마로 연결
        if (key === "거주가족") {
            if (!surveyData[key]) {
                surveyData[key] = value;
            } else {
                surveyData[key] += ", " + value;
            }
        } else {
            surveyData[key] = value;
        }
    });

    // POST 요청용 FormData
    const postData = new FormData();
    postData.append("action", "updateStudentInfo");
    postData.append("num", currentStudentNum);
    postData.append("surveyData", JSON.stringify(surveyData));

    try {
        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: postData
        });
        const result = await response.json();

        if (result.result === "success") {
            stepSurvey.classList.add("hidden");
            stepDone.classList.remove("hidden");
            window.scrollTo(0, 0);
        } else {
            alert("제출에 실패했습니다: " + (result.message || "알 수 없는 오류"));
        }
    } catch (err) {
        console.error(err);
        alert("서버 저장 중 오류가 발생했습니다.");
    } finally {
        toggleLoading(false);
    }
});
