// ✅ Student Survey App JS (v1)

// [중요] 실제 서비스 시에는 선생님의 GAS SCRIPT_URL로 교체 완료해야 함
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyQ8C5hCol8ADNlvc8ULzm9D-LefWeEvoNN3V7lSKoIcPKJBZRnX-Hc8h18qw2AXH6djw/exec";

let currentStudentNum = null; // 초기화

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
const btnContacts = document.querySelectorAll(".btn-contact"); // 연락처 검색 버튼들

const surveyForm = document.getElementById("survey-form");
const btnSubmit = document.getElementById("btn-submit"); // 제출 버튼
const privacyConsent = document.getElementById("privacy-consent"); // 동의 체크박스

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

// 2-0. 연락처 찾기 (Contact Picker API)
btnContacts.forEach(btn => {
    // 지원하지 않는 브라우저면 버튼 숨기기 (또는 놔두고 클릭 시 알림)
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
        btn.style.display = 'none'; // 미지원 시 깔끔하게 숨김
    }

    btn.addEventListener("click", async () => {
        const targetName = btn.dataset.target;
        const targetInput = surveyForm.elements[targetName];

        try {
            const props = ['tel'];
            const opts = { multiple: false };
            const contacts = await navigator.contacts.select(props, opts);

            if (contacts.length > 0) {
                const contact = contacts[0];
                if (contact.tel && contact.tel.length > 0) {
                    // 전화번호에서 숫자만 추출 후 하이픈 적용
                    let rawTel = contact.tel[0].replace(/[^0-9]/g, "");
                    // 010 등으로 시작 안 할수도 있으니(국가번호 등) 간단히 처리
                    if (rawTel.startsWith("82")) rawTel = "0" + rawTel.substring(2);

                    targetInput.value = autoHyphen(rawTel);
                    // 입력 이벤트 발생시켜야 저장/하이픈 로직 등이 돔
                    targetInput.dispatchEvent(new Event('input'));
                } else {
                    alert("선택한 연락처에  전화번호가 없습니다.");
                }
            }
        } catch (ex) {
            // 취소하거나 에러
            console.log(ex);
        }
    });
});

// 2-0-1. 주소 검색 (Daum 우편번호 API)
const btnSearchAddr = document.getElementById("btn-search-addr");
const addrInput = document.getElementById("address-input");
const zipInput = document.getElementById("zip-code"); // [NEW] 우편번호

if (btnSearchAddr) {
    btnSearchAddr.addEventListener("click", () => {
        new daum.Postcode({
            oncomplete: function (data) {
                // 팝업에서 검색결과 항목을 클릭했을때 실행할 코드를 작성하는 부분.
                // data.zonecode: 우편번호
                // data.address: 기본 주소 (도로명/지번)
                // data.buildingName: 건물명 (아파트 이름 등)

                let fullAddr = data.address;
                let extraAddr = '';

                if (data.userSelectedType === 'R') {
                    // 법정동명이 있을 경우 추가한다. (법정리는 제외)
                    // 법정동의 경우 마지막 문자가 "동/로/가"로 끝난다.
                    if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
                        extraAddr += data.bname;
                    }
                    // 건물명이 있고, 공동주택일 경우 추가한다.
                    if (data.buildingName !== '' && data.apartment === 'Y') {
                        extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
                    }
                    // 표시할 참고항목이 있을 경우, 괄호까지 추가한 최종 문자열을 만든다.
                    if (extraAddr !== '') {
                        fullAddr += ' (' + extraAddr + ')';
                    }
                }

                // 우편번호와 주소 입력
                if (zipInput) zipInput.value = data.zonecode;
                addrInput.value = fullAddr;

                // 입력 이벤트 발생 (저장 로직 트리거)
                if (zipInput) zipInput.dispatchEvent(new Event('input'));
                addrInput.dispatchEvent(new Event('input'));
            }
        }).open();
    });
}

// 2-1. 개인정보 동의 체크박스 로직
function updateSubmitButton() {
    btnSubmit.disabled = !privacyConsent.checked;
}

// 초기 상태 설정
updateSubmitButton();

// 변경 시 상태 업데이트
privacyConsent.addEventListener("change", updateSubmitButton);

// ------------------------------------
// 💾 데이터 안전 저장 (LocalStorage)
// ------------------------------------
const STORAGE_KEY = "survey_autosave_data";

// 1. 저장 함수
function saveToLocal() {
    const formData = new FormData(surveyForm);
    const data = {};
    formData.forEach((value, key) => {
        // 이미 값이 있으면 배열로 만듦 (체크박스 등)
        if (data[key]) {
            if (!Array.isArray(data[key])) {
                data[key] = [data[key]];
            }
            data[key].push(value);
        } else {
            data[key] = value;
        }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log("자동 저장 완료: " + new Date().toLocaleTimeString());
}

// 2. 불러오기 함수
function loadFromLocal() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
        const data = JSON.parse(saved);
        Object.keys(data).forEach(key => {
            const el = surveyForm.elements[key];
            if (!el) return;

            const val = data[key];

            // NodeList(라디오, 체크박스)인 경우
            if (el instanceof NodeList) {
                el.forEach(input => {
                    if (Array.isArray(val)) {
                        if (val.includes(input.value)) input.checked = true;
                    } else {
                        if (input.value === val) input.checked = true;
                    }
                });
            } else if (el.type === "checkbox") {
                // 단일 체크박스
                // (현재 폼에는 '거주가족' 같은 그룹형이 많아서 위 NodeList 로직이 주로 쓰임)
                if (Array.isArray(val)) {
                    if (val.includes(el.value)) el.checked = true;
                } else {
                    el.checked = (el.value === val);
                }
            } else {
                // 일반 input, select, textarea
                el.value = val;
            }
        });
        console.log("임시 저장된 데이터를 불러왔습니다.");

        // 데이터 로드 후 제출 버튼 상태 업데이트
        updateSubmitButton();
    } catch (e) {
        console.error("데이터 복구 실패:", e);
    }
}

// 3. 이벤트 연결 (입력할 때마다 저장)
surveyForm.addEventListener("input", () => {
    saveToLocal();
});

// 페이지 로드 시 데이터 복구
document.addEventListener("DOMContentLoaded", () => {
    loadFromLocal();
});

// ------------------------------------

// 3. 설문 제출 (기존 코드 수정 - LockService 안내는 별도)
surveyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const consent = document.getElementById("privacy-consent");
    if (!consent.checked) {
        return alert("개인정보 수집 및 이용에 동의해주셔야 제출이 가능합니다.");
    }

    // 2-2. 필수 항목 검증
    const requiredInputs = surveyForm.querySelectorAll("[required]");
    for (const input of requiredInputs) {
        if (!input.value.trim()) {
            alert("입력하지 않은 항목이 있습니다.\n확인 후 다시 시도해주세요.");
            input.focus();
            input.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
    }

    // 2-3. 데이터 형식 검증 (유효성 검사)

    // (1) 전화번호 검사 (학생, 부, 모)
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    const phoneInputs = [
        { el: surveyForm.elements['학생폰'], name: "학생 연락처" },
        { el: surveyForm.elements['부(연락처)'], name: "부 연락처" },
        { el: surveyForm.elements['모(연락처)'], name: "모 연락처" }
    ];

    for (const p of phoneInputs) {
        if (p.el && p.el.value && !phoneRegex.test(p.el.value)) {
            alert(`${p.name} 형식이 올바르지 않습니다.\n'010-0000-0000' 형식으로 입력해주세요.`);
            p.el.focus();
            p.el.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
    }

    // (2) 인스타 ID 검사 (@포함 확인)
    const instaEl = surveyForm.elements['인스타 id'];
    if (instaEl && instaEl.value && instaEl.value.trim().length <= 1) {
        alert("인스타 ID를 정확히 입력해주세요.");
        instaEl.focus();
        instaEl.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
    }

    // (3) MBTI 검사 (4글자)
    const mbtiEl = surveyForm.elements['MBTI'];
    if (mbtiEl && mbtiEl.value) {
        const mbtiVal = mbtiEl.value.trim().toUpperCase();
        const mbtiRegex = /^[EI][NS][TF][JP]$/; // MBTI 정규식

        // 정규식 체크 (혹은 4글자인지만 체크)
        if (mbtiVal.length !== 4 && mbtiVal !== "E" && mbtiVal !== "I") {
            // 약식(E/I) 허용한다고 했으므로, 4글자 아니면 경고
            // 엄격하게 하려면: if (!mbtiRegex.test(mbtiVal) && mbtiVal !== "E" && mbtiVal !== "I")
            if (!/^[A-Z]{4}$/.test(mbtiVal) && mbtiVal.length > 1) {
                alert("MBTI는 4글자 영문(예: ENFP)으로 입력해주세요.\n(잘 모르면 E 또는 I 만 적어도 됩니다)");
                mbtiEl.focus();
                mbtiEl.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            }
        }
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

            // [수정] 제출 성공 시에도 LocalStorage 데이터 유지 (사용자 요청)
            // localStorage.removeItem(STORAGE_KEY); 
            // alert("제출이 완료되었습니다. 내용은 브라우저에 임시 저장되어 있습니다.");

        } else {
            alert("제출에 실패했습니다: " + (result.message || "알 수 없는 오류"));
        }
    } catch (err) {
        console.error(err);
        alert("서버 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.\n(입력한 내용은 저장되어 있으니 새로고침 하셔도 됩니다)");
    } finally {
        toggleLoading(false);
    }
});
