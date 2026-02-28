import { fetchStudentRecords, saveRecord, deleteRecord as apiDeleteRecord, uploadEvidencePhoto, fetchSurveyData } from './api.js';
import { formatDate } from './utils.js';
import { API_CONFIG } from './config.js';
import CryptoJS from 'crypto-js';

const urlParams = new URLSearchParams(window.location.search);
const studentName = urlParams.get("name") || "";
const num = urlParams.get("num") || "";

document.addEventListener("DOMContentLoaded", () => {
    setupHeader();
    setupForm();
    loadSettings();
    loadRecords();
    initSurveyPopup();
});

function setupHeader() {
    const mode = urlParams.get("mode");
    if (mode === "counsel") {
        document.title = `${studentName} 학생 상담 기록`;
        document.getElementById("pageTitle").textContent = `${num}번 ${studentName} (상담)`;
        const surveyBtn = document.getElementById("viewSurveyBtn");
        if (surveyBtn) surveyBtn.style.display = "inline-flex";
    } else {
        document.title = `${studentName} 학생 생활기록`;
        document.getElementById("pageTitle").textContent = `${num}번 ${studentName}`;
    }

    // 뒤로가기 버튼
    const backBtn = document.querySelector(".btn-back");
    if (backBtn) {
        backBtn.onclick = goBack;
    }
}

function setupForm() {
    const form = document.getElementById("recordForm");
    const btn = document.getElementById("submitBtn");

    // 현재 시간 설정
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
    const recordTimeInput = document.getElementById("recordTime");
    if (recordTimeInput) recordTimeInput.value = localISOTime;

    const mode = urlParams.get("mode");
    if (mode === "counsel") {
        const behaviorSection = document.getElementById("behavior-section");
        if (behaviorSection) behaviorSection.style.display = "none";
        const detailTextarea = document.getElementById("detail");
        if (detailTextarea) {
            detailTextarea.placeholder = "상담 내용을 상세히 입력하세요...";
            // 자동 높이 조절 기능 추가
            detailTextarea.style.overflowY = "hidden";
            detailTextarea.addEventListener("input", function () {
                this.style.height = "auto";
                this.style.height = (this.scrollHeight) + "px";
            });
        }
    }

    // 사진 입력 및 미리보기 설정
    const photoInput = document.getElementById("photoInput");
    const photoPreviewContainer = document.getElementById("photoPreviewContainer");
    let selectedFile = null;

    if (photoInput) {
        photoInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            selectedFile = await resizeImage(file, 1200); // 가로 1200px로 리사이징

            // 미리보기 표시
            const reader = new FileReader();
            reader.onload = (re) => {
                photoPreviewContainer.innerHTML = `<img src="${re.target.result}" style="max-width:100%; border-radius:8px; margin-top:10px; cursor:pointer;" onclick="window.open(this.src)">`;
            };
            reader.readAsDataURL(selectedFile);
        });
    }

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            btn.disabled = true;
            btn.textContent = "저장 중...";

            try {
                let photoUrls = [];
                if (selectedFile) {
                    btn.textContent = "사진 업로드 중...";
                    const url = await uploadEvidencePhoto(selectedFile, num);
                    photoUrls.push(url);
                }

                const formData = new FormData();
                formData.append("num", num);
                formData.append("name", studentName);
                formData.append("time", recordTimeInput.value);

                // 모드에 따라 값 수집
                const mode = urlParams.get("mode");
                if (mode === "counsel") {
                    formData.append("good", "상담");
                } else {
                    const goodVal = document.getElementById("good").value;
                    const badVal = document.getElementById("bad").value;
                    if (goodVal) formData.append("good", goodVal);
                    if (badVal) formData.append("bad", badVal);
                }

                formData.append("detail", document.getElementById("detail").value);

                // 교사 이름 자동 추출 및 추가
                const encrypted = localStorage.getItem('teacher_auth_token');
                if (encrypted) {
                    const bytes = CryptoJS.AES.decrypt(encrypted, API_CONFIG.SECRET_KEY);
                    const email = bytes.toString(CryptoJS.enc.Utf8);
                    if (email) {
                        formData.append("teacher", email.split('@')[0]);
                    }
                }

                formData.append("action", "addRecord");

                if (photoUrls.length > 0) {
                    formData.append("photos", JSON.stringify(photoUrls));
                }

                const data = await saveRecord(formData);
                if (data.result === "success") {
                    alert("✅ 저장되었습니다.");
                    form.reset();
                    photoPreviewContainer.innerHTML = "";
                    selectedFile = null;

                    const now2 = new Date();
                    const localISO2 = new Date(now2 - offset).toISOString().slice(0, 16);
                    recordTimeInput.value = localISO2;

                    btn.disabled = false;
                    btn.textContent = "기록 저장";
                    loadRecords();
                } else {
                    alert("저장 실패: " + data.message);
                    btn.disabled = false;
                    btn.textContent = "기록 저장";
                }
            } catch (error) {
                console.error("Save Error:", error);
                alert("처리 중 오류가 발생했습니다: " + error.message);
                btn.disabled = false;
                btn.textContent = "기록 저장";
            }
        });
    }
}

/**
 * 이미지 리사이징 함수
 */
function resizeImage(file, maxWidth) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', 0.8);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function loadRecords() {
    const logBox = document.getElementById("logContainer");
    if (!logBox) return;

    logBox.innerHTML = ""; // 기존 내용 초기화
    logBox.className = "loading-records"; // 애니메이션 클래스 추가

    try {
        const data = await fetchStudentRecords(num);

        logBox.className = ""; // 로딩 완료 후 클래스 제거
        logBox.innerHTML = ""; // 메시지 비우기

        // 데이터 구조 호환성 처리 (배열인 경우와 객체 내 records인 경우 모두 지원)
        let list = [];
        if (Array.isArray(data)) {
            list = data;
        } else if (data && Array.isArray(data.records)) {
            list = data.records;
        } else if (data && typeof data === 'object') {
            // 혹시 { data: [...] } 같은 다른 키로 올 경우를 대비해 키들을 찍어봄
            console.log("Keys:", Object.keys(data));
        }

        if (list.length === 0) {
            logBox.innerHTML = "<p>기록된 내용이 없습니다.</p>";
            return;
        }

        // 최신순 정렬
        list.sort((a, b) => new Date(b.time) - new Date(a.time));

        logBox.innerHTML = ""; // 초기화

        list.forEach(r => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "log-item";

            // 내용 구성
            const headerDiv = document.createElement("div");
            headerDiv.style.fontSize = "0.85em";
            headerDiv.style.color = "#888";
            headerDiv.style.marginBottom = "5px";
            headerDiv.style.marginRight = "50px";
            headerDiv.textContent = `📅 ${formatDate(r.time)} | 🧑‍🏫 ${r.teacher || "미입력"}`;

            itemDiv.appendChild(headerDiv);

            if (r.good) {
                const goodDiv = document.createElement("div");
                goodDiv.style.color = "#2196F3";
                goodDiv.style.fontWeight = "bold";
                goodDiv.textContent = `👍 ${r.good}`;
                itemDiv.appendChild(goodDiv);
            }

            if (r.bad) {
                const badDiv = document.createElement("div");
                badDiv.style.color = "#F44336";
                badDiv.style.fontWeight = "bold";
                badDiv.textContent = `👎 ${r.bad}`;
                itemDiv.appendChild(badDiv);
            }

            if (r.detail) {
                const detailDiv = document.createElement("div");
                detailDiv.style.marginTop = "5px";
                detailDiv.style.color = "#333";
                detailDiv.textContent = `📝 ${r.detail}`;
                itemDiv.appendChild(detailDiv);
            }

            // [추가] 사진/반성문 표시
            if (r.photos && r.photos.length > 0) {
                const photoDiv = document.createElement("div");
                photoDiv.style.marginTop = "10px";
                r.photos.forEach(photoUrl => {
                    const img = document.createElement("img");
                    img.src = photoUrl;
                    img.className = "record-photo-thumb";
                    img.style.width = "80px";
                    img.style.height = "80px";
                    img.style.objectFit = "cover";
                    img.style.borderRadius = "4px";
                    img.style.cursor = "pointer";
                    img.style.border = "1px solid #ddd";
                    img.onclick = () => window.open(photoUrl);
                    photoDiv.appendChild(img);

                    const label = document.createElement("span");
                    label.textContent = " 📷 반성문 있음 (클릭 시 확대)";
                    label.style.fontSize = "0.8em";
                    label.style.color = "#666";
                    photoDiv.appendChild(label);
                });
                itemDiv.appendChild(photoDiv);
            }

            // 삭제 버튼
            const delBtn = document.createElement("button");
            delBtn.className = "btn-delete";
            delBtn.textContent = "🗑 삭제";
            delBtn.onclick = () => handleDelete(r.num, r.time);
            itemDiv.appendChild(delBtn);

            logBox.appendChild(itemDiv);
        });

    } catch (error) {
        console.error("Load Error:", error);
        logBox.innerHTML = "<p>기록을 불러오지 못했습니다.</p>";
    } finally {
        logBox.className = ""; // 로딩 애니메이션 제거 (성공/실패 공통)
    }
}

async function handleDelete(targetNum, targetTime) {
    if (!confirm("정말 이 기록을 삭제하시겠습니까?")) return;

    try {
        const data = await apiDeleteRecord(targetNum, targetTime);
        if (data.result === "success") {
            alert("🗑 삭제되었습니다.");
            loadRecords(); // 새로고침 대신 목록 갱신
        } else {
            alert("삭제 실패: " + data.message);
        }
    } catch (error) {
        console.error("Delete Error:", error);
        alert("삭제 중 통신 오류가 발생했습니다.");
    }
}

function goBack() {
    if (!num || num.length < 2) {
        window.location.href = "stu-list.html";
        return;
    }
    const grade = num.charAt(0);
    const classNum = num.charAt(1);
    window.location.href = `stu-list.html?grade=${grade}&class=${classNum}`;
}

/**
 * Settings 시트의 설정 항목을 불러와서 셀렉트 박스를 채웁니다.
 */
async function loadSettings() {
    const goodSelect = document.getElementById("good");
    const badSelect = document.getElementById("bad");

    try {
        if (goodSelect) goodSelect.innerHTML = '<option value="">⏳ 로딩 중...</option>';
        if (badSelect) badSelect.innerHTML = '<option value="">⏳ 로딩 중...</option>';

        const response = await fetch(`${API_CONFIG.SCRIPT_URL}?action=getSettings`);
        if (!response.ok) throw new Error("Network response was not ok");
        const settings = await response.json();

        if (goodSelect) {
            goodSelect.innerHTML = '<option value="">선택</option>';
            if (settings.good && Array.isArray(settings.good)) {
                settings.good.forEach(item => {
                    const opt = document.createElement("option");
                    opt.value = item;
                    opt.textContent = item;
                    goodSelect.appendChild(opt);
                });
            }
        }

        if (badSelect) {
            badSelect.innerHTML = '<option value="">선택</option>';
            if (settings.bad && Array.isArray(settings.bad)) {
                settings.bad.forEach(item => {
                    const opt = document.createElement("option");
                    opt.value = item;
                    opt.textContent = item;
                    badSelect.appendChild(opt);
                });
            }
        }
    } catch (error) {
        console.error("Settings Load Error:", error);
        if (goodSelect) goodSelect.innerHTML = '<option value="">데이터 로드 실패</option>';
        if (badSelect) badSelect.innerHTML = '<option value="">데이터 로드 실패</option>';
    }
}

/**
 * 기초조사 팝업 초기화 및 이벤트 바인딩 (이벤트 위임 방식)
 */
function initSurveyPopup() {
    const surveyBtn = document.getElementById("viewSurveyBtn");
    if (surveyBtn) {
        surveyBtn.onclick = openSurveyPopup;
    }

    // 이벤트 위임: 문서 전체에서 클릭을 감지하여 팝업 닫기 처리
    document.addEventListener("click", (e) => {
        // 닫기 버튼(✕) 또는 배경(overlay) 클릭 시
        if (e.target.closest(".close-btn") || e.target.id === "overlay") {
            closePopup();
        }
    });
}

/**
 * 기초조사 팝업 열기 및 렌더링
 */
async function openSurveyPopup(e) {
    if (e) e.preventDefault();

    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    if (!popup || !overlay) return;

    overlay.style.display = "block";
    popup.style.display = "block";
    popup.className = "student-detail-popup";

    // 배경 스크롤 방지
    document.body.style.overflow = "hidden";

    popup.innerHTML = `<div style="padding:20px; text-align:center;">기초조사 불러오는 중...</div>`;

    const data = await fetchSurveyData(num);
    if (!data) {
        popup.innerHTML = `
            <div class="popup-header">
                <div class="popup-title-center">기초조사 오류</div>
                <button class="close-btn">✕</button>
            </div>
            <div style="padding:20px; text-align:center;">데이터를 불러오지 못했습니다.</div>`;
        return;
    }

    const { student, survey } = data;
    const surveyData = survey || {};
    // 정규화된 키 추가
    for (let k in surveyData) {
        if (typeof k === 'string') {
            surveyData[k.toUpperCase()] = surveyData[k];
        }
    }

    const intimacyMap = { "1": "거의 모름", "2": "조금 암", "3": "보통", "4": "친함", "5": "매우 친함" };
    const getValue = (primary, secondary, ...keys) => {
        for (const key of keys) {
            if (primary && primary[key] && primary[key] !== "null" && primary[key] !== "undefined") return primary[key];
            if (secondary && secondary[key] && secondary[key] !== "null" && secondary[key] !== "undefined") return secondary[key];
        }
        return ".";
    };

    const createInfoRow = (label, val) => {
        let valStr = String(val || "").trim();
        if (valStr === "" || valStr === "null" || valStr === "." || valStr === "없음") valStr = ".";
        let displayVal = valStr;
        if (label.includes("친밀도") && intimacyMap[valStr]) displayVal = intimacyMap[valStr];

        return `<div class="detail-info-row">
            <span class="detail-label">${label}</span>
            <span class="detail-value" style="font-weight:700;">${displayVal}</span>
        </div>`;
    };

    // 2사분면: 기본 정보
    let infoHtml2 = "";
    infoHtml2 += createInfoRow("연락처", getValue(student, surveyData, "연락처", "contact", "학생폰"));
    infoHtml2 += createInfoRow("인스타", getValue(student, surveyData, "인스타", "instagram", "insta"));
    infoHtml2 += createInfoRow("집주소", getValue(student, surveyData, "주소", "집주소", "address"));
    infoHtml2 += createInfoRow("학적", getValue(student, surveyData, "학적", "status"));
    infoHtml2 += createInfoRow("성별", getValue(student, surveyData, "성별", "gender"));

    // 3사분면: 가족관계
    let infoHtml3 = "";
    infoHtml3 += createInfoRow("주보호자 관계", getValue(surveyData, {}, "주보호자 관계", "보호자관계"));
    infoHtml3 += createInfoRow("주보호자 연락처", getValue(surveyData, {}, "주보호자 연락처", "보호자연락처"));
    infoHtml3 += createInfoRow("거주가족", getValue(surveyData, {}, "거주가족", "가족구성"));

    // 4사분면: 상세 기초조사
    let infoHtml4 = "";
    const excludeKeys = ["번호", "연락처", "인스타", "집주소", "학적", "성별", "학번", "이름", "student_id", "photo_url", "data", "student_pid", "id", "submitted_at", "PID", "CREATED_AT", "UPDATED_AT"];
    for (let key in surveyData) {
        if (!excludeKeys.includes(key) && key === key.toLowerCase() && surveyData[key] && surveyData[key] !== ".") {
            infoHtml4 += createInfoRow(key, surveyData[key]);
        }
    }

    const imgSrc = student["사진저장링크"] || "";

    popup.innerHTML = `
        <div class="popup-header">
            <div class="popup-title-center">
                <span class="student-id-badge">${student["학번"]}</span>
                <span class="student-name-text">${student["이름"]} 기초조사</span>
            </div>
            <button class="close-btn" onclick="closePopup()">✕</button>
        </div>
        <div class="popup-quadrants-container" style="padding: 15px; box-sizing: border-box;">
            <div class="popup-quadrant quad-1">
                <div class="quad-label" style="background:#fff1f0; color:#cf1322;">PHOTO</div>
                <div class="photo-wrapper">
                    ${imgSrc ? `<img src="${imgSrc}" style="max-width:100%; border-radius:12px;">` : `<div class="no-photo-placeholder">사진 없음</div>`}
                </div>
            </div>
            <div class="popup-quadrant quad-2">
                <div class="quad-label" style="background:#f6ffed; color:#389e0d;">BASIC INFO</div>
                <div class="quad-scroll">${infoHtml2}</div>
            </div>
            <div class="popup-quadrant quad-3">
                <div class="quad-label" style="background:#e6f7ff; color:#096dd9;">FAMILY & CONTACT</div>
                <div class="quad-scroll">${infoHtml3}</div>
            </div>
            <div class="popup-quadrant quad-4">
                <div class="quad-label" style="background:#f9f0ff; color:#531dab;">SURVEY DETAILS</div>
                <div class="quad-scroll">${infoHtml4 || ". (상세 정보 없음)"}</div>
            </div>
        </div>
    `;
}

/**
 * 팝업 닫기
 */
function closePopup() {
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    if (popup) popup.style.display = "none";
    if (overlay) overlay.style.display = "none";
    document.body.style.overflow = "auto";
}

// 전역 공개
window.closePopup = closePopup;
window.openSurveyPopup = openSurveyPopup;
window.openVFlat = openVFlat;

console.log("✅ record.js 로드 완료");
