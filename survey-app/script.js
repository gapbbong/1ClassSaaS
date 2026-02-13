// ✅ Student Survey App JS (v2)

// [중요] 실제 서비스 시에는 선생님의 GAS SCRIPT_URL로 교체 완료해야 함
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzzK6YSbk7I42HruE1JVmetKj0czQQZ82H-ZTlm0gX2Aa4FI4n1ndn87ooO-t0jxPyx/exec";

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
// 전화번호 입력 이벤트 바인딩 (자동 하이픈 & 유효성 검사)
document.querySelectorAll('input[type="tel"]').forEach(input => {
    // 1. 자동 하이픈
    input.addEventListener("input", (e) => {
        const hyphenated = autoHyphen(e.target.value);
        if (hyphenated.length <= 13) {
            e.target.value = hyphenated;
        }
    });

    // 2. 포커스 벗어날 때(다음 칸 넘어갈 때) 형식 검사
    input.addEventListener("blur", (e) => {
        const val = e.target.value.trim();
        // 값이 있을 때만 검사 (빈 값은 필수 체크에서 잡음)
        if (val.length > 0) {
            const phoneRegex = /^010-\d{4}-\d{4}$/;
            if (!phoneRegex.test(val)) {
                alert("전화번호 형식이 올바르지 않습니다.\n'010-0000-0000' 형식으로 입력해주세요.");
            }
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

// MBTI 실시간 유효성 검사
const mbtiInput = document.querySelector('input[name="MBTI"]');
if (mbtiInput) {
    mbtiInput.addEventListener("input", (e) => {
        // 소문자 자동 대문자 변환 및 영문 외 제거
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    });

    mbtiInput.addEventListener("blur", (e) => {
        const val = e.target.value.trim();
        if (val.length === 0) return;

        if (val.length >= 5) {
            alert("MBTI는 최대 4글자까지만 입력 가능합니다.");
            return;
        }

        const validMbtiRegex = /^[EI][SN][TF][JP]$/;
        const isOneCharValid = (val === 'E' || val === 'I');

        if (val.length === 4) {
            if (!validMbtiRegex.test(val)) {
                alert("올바른 MBTI 형식이 아닙니다. (예: ENFP, ISTJ 등)");
            }
        } else if (val.length === 1) {
            if (!isOneCharValid) {
                alert("한 글자만 입력할 경우 'E' 또는 'I'만 가능합니다.");
            }
        } else {
            // 2, 3글자인 경우
            alert("MBTI는 4글자 전체(예: ENFP)를 입력하거나,\n잘 모를 경우 'E' 또는 'I' 단일 문자로만 입력해주세요.");
        }
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
// 버튼 이벤트 연결을 DOMContentLoaded 내부로 이동
document.addEventListener("DOMContentLoaded", () => {
    const btnSearchAddr = document.getElementById("btn-search-addr");
    const addrInput = document.getElementById("address-input");
    const zipInput = document.getElementById("zip-code");

    if (btnSearchAddr) {
        btnSearchAddr.addEventListener("click", () => {
            // [Debug] 클릭 확인용
            // alert("주소 검색 버튼이 클릭되었습니다."); 

            if (typeof daum === 'undefined') {
                alert("다음 우편번호 서비스가 아직 로딩되지 않았습니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            try {
                new daum.Postcode({
                    oncomplete: function (data) {
                        let fullAddr = data.address;
                        let extraAddr = '';

                        if (data.userSelectedType === 'R') {
                            if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
                                extraAddr += data.bname;
                            }
                            if (data.buildingName !== '' && data.apartment === 'Y') {
                                extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
                            }
                            if (extraAddr !== '') {
                                fullAddr += ' (' + extraAddr + ')';
                            }
                        }

                        if (zipInput) zipInput.value = data.zonecode;
                        addrInput.value = fullAddr;

                        if (zipInput) zipInput.dispatchEvent(new Event('input'));
                        addrInput.dispatchEvent(new Event('input'));
                    }
                }).open();
            } catch (e) {
                alert("주소 검색 팝업을 여는 도중 오류가 발생했습니다: " + e.message);
            }
        });
    }

    const btnContacts = document.querySelectorAll(".btn-contact");
    btnContacts.forEach(btn => {
        // 지원하지 않는 브라우저면 버튼 숨기기
        if (!('contacts' in navigator && 'ContactsManager' in window)) {
            // 사용자가 '안 눌린다'고 했으므로, 숨기지 않고 눌렀을 때 안내 메시지를 띄우는 것이 나을 수 있음
            // btn.style.display = 'none'; 
        }

        btn.addEventListener("click", async () => {
            if (!('contacts' in navigator && 'ContactsManager' in window)) {
                return alert("이 브라우저/기기에서는 연락처 불러오기 기능을 지원하지 않습니다.\n(안드로이드 스마트폰의 Chrome/Samsung Internet 권장)");
            }

            const targetName = btn.dataset.target;
            const targetInput = surveyForm.elements[targetName];

            try {
                const props = ['tel'];
                const opts = { multiple: false };
                const contacts = await navigator.contacts.select(props, opts);

                if (contacts.length > 0) {
                    const contact = contacts[0];
                    if (contact.tel && contact.tel.length > 0) {
                        let rawTel = contact.tel[0].replace(/[^0-9]/g, "");
                        if (rawTel.startsWith("82")) rawTel = "0" + rawTel.substring(2);

                        targetInput.value = autoHyphen(rawTel);
                        targetInput.dispatchEvent(new Event('input'));
                    } else {
                        alert("선택한 연락처에 전화번호가 없습니다.");
                    }
                }
            } catch (ex) {
                console.log(ex);
            }
        });
    });
});

// 2-1. 개인정보 동의 체크박스 로직
// 2-1. 제출 버튼 상태 업데이트 (동의 + 필수항목 체크)
function updateSubmitButton() {
    const isConsentChecked = privacyConsent.checked;
    const requiredInputs = surveyForm.querySelectorAll("[required]");

    // 누락된 항목 이름 수집
    const missingNames = [];
    let allFilled = true;

    for (const input of requiredInputs) {
        if (!input.value.trim()) {
            allFilled = false;
            // 라벨 찾기 (부모 요소 내의 label 태그 등)
            // .input-item 내에 label이 있다고 가정
            const parent = input.closest('.input-item');
            if (parent) {
                const label = parent.querySelector('label');
                if (label) {
                    // "부 연락처 🔍" 처럼 버튼 텍스트가 포함될 수 있으므로 정제 필요
                    // 간단히 textContent 가져오고 🔍 등 제거
                    let labelText = label.innerText.replace(/🔍/g, '').trim();
                    // 필수 표시(*) 등이 있다면 제거 (현재 코드엔 없음)
                    missingNames.push(labelText);
                }
            } else if (input === privacyConsent) {
                // 동의 체크박스는 별도 처리
            }
        }
    }

    if (!isConsentChecked) {
        missingNames.push("개인정보 수집 및 이용 동의");
    }

    // 메시지 박스 업데이트
    const msgBox = document.getElementById("missing-fields-msg");
    const msgList = document.getElementById("missing-list");

    // 동의했고 다 채웠으면
    const isComplete = isConsentChecked && allFilled;
    btnSubmit.disabled = !isComplete;

    if (msgBox && msgList) {
        if (isComplete) {
            msgBox.classList.add("hidden");
        } else {
            msgBox.classList.remove("hidden");
            msgList.innerHTML = "";

            // 너무 많으면 "외 N건" 처리하거나 그냥 다 보여줌 (여기선 다 보여줌)
            missingNames.forEach(name => {
                const li = document.createElement("li");
                li.textContent = name;
                msgList.appendChild(li);
            });
        }
    }

    // 시각적 피드백
    if (btnSubmit.disabled) {
        btnSubmit.style.opacity = "0.5";
        btnSubmit.style.cursor = "not-allowed";
        btnSubmit.textContent = "필수 항목을 모두 입력해주세요";
    } else {
        btnSubmit.style.opacity = "1";
        btnSubmit.style.cursor = "pointer";
        btnSubmit.textContent = "설문 제출하기 🚀";
    }
}

// 초기 상태 설정
updateSubmitButton();

// 변경 시 상태 업데이트 (동의 체크박스)
privacyConsent.addEventListener("change", updateSubmitButton);

// 변경 시 상태 업데이트 (모든 입력 필드)
surveyForm.addEventListener("input", updateSubmitButton);
surveyForm.addEventListener("change", updateSubmitButton);

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
    localStorage.setItem("current_student_num", currentStudentNum); // 학번 정보도 함께 저장
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

        // 학번 정보 복구
        const savedNum = localStorage.getItem("current_student_num");
        if (savedNum && savedNum !== "null") {
            currentStudentNum = savedNum;
            // 만약 학번이 있다면 조회 단계를 건너뛰고 설문지로 바로 가도록 처리 (선택사항)
            stepVerify.classList.add("hidden");
            stepSurvey.classList.remove("hidden");
        }

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

    if (!currentStudentNum) {
        alert("학번 정보가 유실되었습니다. 다시 한 번 학번 조회를 해주세요.");
        location.reload(); // 안전을 위해 새로고침
        return;
    }

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

    // (3) MBTI 검사
    const mbtiEl = surveyForm.elements['MBTI'];
    if (mbtiEl && mbtiEl.value) {
        const mbtiVal = mbtiEl.value.trim().toUpperCase();
        const validMbtiRegex = /^[EI][SN][TF][JP]$/;
        const isOneCharValid = (mbtiVal === 'E' || mbtiVal === 'I');

        let isMbtiValid = false;
        if (mbtiVal.length === 4 && validMbtiRegex.test(mbtiVal)) {
            isMbtiValid = true;
        } else if (mbtiVal.length === 1 && isOneCharValid) {
            isMbtiValid = true;
        }

        if (!isMbtiValid) {
            alert("MBTI 형식이 올바르지 않습니다.\n4글자 전체를 입력하거나, 'E' 또는 'I'만 입력해주세요.");
            mbtiEl.focus();
            mbtiEl.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
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
        // 복수 선택 항목 처리 (거주가족, 다문화여부, 등교수단)
        if (key === "거주가족" || key === "다문화여부" || key === "등교수단") {
            if (!surveyData[key]) {
                surveyData[key] = value;
            } else {
                surveyData[key] += ", " + value;
            }
        } else {
            surveyData[key] = value;
        }
    });

    // [수정] 상세주소 합치기
    if (surveyData['상세주소']) {
        surveyData['집주소'] = surveyData['집주소'] + " " + surveyData['상세주소'];
        delete surveyData['상세주소']; // 구글시트에는 '상세주소' 컬럼이 없으므로 제거 (또는 합쳐서 보냄)
    }

    // POST 요청용 FormData
    const postData = new FormData();
    postData.append("action", "updateStudentInfo");
    postData.append("num", currentStudentNum);

    // [추가] 학적 자동 설정
    surveyData['학적'] = "재학";

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
