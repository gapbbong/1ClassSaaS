import { API_CONFIG } from './config.js';
import { extractDriveId, getThumbnailUrl } from './utils.js';
import { fetchStudentsByClass, fetchClassInfo, saveRecord } from './api.js';
import { supabase } from './supabase.js';
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'oneclass25-secret-auth-key';

function getStoredEmailPrefix() {
    const encrypted = localStorage.getItem('teacher_auth_token');
    if (!encrypted) return "교사";
    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
        const email = bytes.toString(CryptoJS.enc.Utf8);
        return email ? email.split('@')[0] : "교사";
    } catch (e) {
        return "교사";
    }
}

// URL 파라미터 파싱
const urlParams = new URLSearchParams(window.location.search);
const grade = parseInt(urlParams.get("grade"));
const classNum = parseInt(urlParams.get("class"));

document.addEventListener("DOMContentLoaded", async () => {
    // DB에서 교사 정보 호출
    const classInfo = await fetchClassInfo();

    // 1. 타이틀 및 교사 정보 설정
    setupHeader(classInfo);

    // 2. 학생 데이터 불러오기
    loadStudents();

    // 3. 이벤트 리스너 설정 (플로팅 버튼 등)
    setupEventListeners();

    // 4. 안내 메시지 추가
    setupGuidance();

    // 5. 서비스 워커 등록
    registerServiceWorker();
});

function setupGuidance() {
    // 사용자가 '다시 보지 않기'를 선택했는지 확인
    if (localStorage.getItem("hideGuidanceTooltip") === "true") return;

    const list = document.getElementById("student-list");
    if (!list) return;

    // 모달형 툴팁 생성
    const overlay = document.createElement("div");
    overlay.className = "guidance-tooltip-overlay";

    overlay.innerHTML = `
        <div class="guidance-tooltip-content">
            <h3>💡 생활기록 팁</h3>
            <p>학생 사진을 <strong>길게 누르면</strong><br>바로 생활기록을 할 수 있습니다!</p>
            <div class="guidance-tooltip-footer">
                <button class="close-tooltip-btn">확인</button>
                <button class="never-see-again-btn">다시 보지 않기</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // 이벤트 리스너
    const closeBtn = overlay.querySelector(".close-tooltip-btn");
    const neverBtn = overlay.querySelector(".never-see-again-btn");

    closeBtn.onclick = () => {
        document.body.removeChild(overlay);
    };

    neverBtn.onclick = () => {
        localStorage.setItem("hideGuidanceTooltip", "true");
        document.body.removeChild(overlay);
    };

    // 배경 클릭 시 닫기
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
}

function setupHeader(classInfo) {
    const titleElement = document.getElementById("class-title");
    if (grade && classNum) {
        titleElement.textContent = `${grade}학년 ${classNum}반`;
        document.title = `${grade}학년 ${classNum}반 학생 목록`;
    } else {
        titleElement.textContent = "반 정보 없음";
    }

    const teacherInfoElement = document.getElementById("teacher-info");
    const info = classInfo ? classInfo.find(c => c.grade === grade && c.class === classNum) : null;
    if (info) {
        // 교사 이름 클릭 → 연락처 모달 방식으로 변경
        teacherInfoElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center;">
                <button class="teacher-contact-btn" onclick="showTeacherModal(${JSON.stringify(info).replace(/"/g, '&quot;')})">
                    <span class="teacher-badge homeroom">담임</span>
                    <span class="teacher-name">${info.homeroom}</span>
                </button>
                ${info.sub ? `
                <button class="teacher-contact-btn" onclick="showTeacherModal(${JSON.stringify(info).replace(/"/g, '&quot;')}, true)">
                    <span class="teacher-badge sub">부담임</span>
                    <span class="teacher-name">${info.sub}</span>
                </button>` : ''}
            </div>
        `;
    }
}

// 교사 연락처 모달 표시
window.showTeacherModal = function (info, showSub = false) {
    const existing = document.getElementById("teacher-contact-modal");
    if (existing) existing.remove();

    const name = showSub ? info.sub : info.homeroom;
    const phone = showSub ? info.subPhone : info.homeroomPhone;
    const role = showSub ? "부담임" : "담임";

    const modal = document.createElement("div");
    modal.id = "teacher-contact-modal";
    modal.className = "guidance-tooltip-overlay";
    modal.innerHTML = `
        <div class="guidance-tooltip-content teacher-modal">
            <div class="teacher-modal-header">
                <span class="teacher-badge ${showSub ? 'sub' : 'homeroom'}">${role}</span>
                <h3>${name} 선생님</h3>
            </div>
            <p class="teacher-phone">${phone}</p>
            <div class="teacher-modal-actions">
                <a href="tel:${phone}" class="modal-action-btn call-btn">
                    <span>📞</span> 전화
                </a>
                <a href="sms:${phone}" class="modal-action-btn sms-btn">
                    <span>💬</span> 문자
                </a>
            </div>
            ${info.sub ? `
            <div class="teacher-modal-switch">
                <button onclick="this.closest('.guidance-tooltip-overlay').remove(); showTeacherModal(${JSON.stringify(info).replace(/"/g, '&quot;')}, ${!showSub})">
                    ${showSub ? `담임 ${info.homeroom} 선생님 연락처` : `부담임 ${info.sub} 선생님 연락처`} 보기
                </button>
            </div>` : ''}
            <div class="guidance-tooltip-footer" style="margin-top:16px;">
                <button class="close-tooltip-btn" onclick="this.closest('.guidance-tooltip-overlay').remove()">닫기</button>
            </div>
        </div>
    `;

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
};


function setupEventListeners() {
    // 플로팅 컨트롤 (네비게이션)
    const prevBtn = document.getElementById("prev-btn");
    const homeBtn = document.getElementById("home-btn");
    const surveyBtn = document.getElementById("survey-viewer-btn");
    const nextBtn = document.getElementById("next-btn");

    if (prevBtn) prevBtn.addEventListener("click", () => goToRelativeClass(-1));
    if (homeBtn) homeBtn.addEventListener("click", goHome);
    if (nextBtn) nextBtn.addEventListener("click", () => goToRelativeClass(1));
    if (surveyBtn) {
        surveyBtn.addEventListener("click", () => {
            window.location.href = `class-survey.html?grade=${grade || 1}&class=${classNum || 1}`;
        });
    }

    // 팝업 오버레이 클릭 시 닫기
    const overlay = document.getElementById("overlay");
    if (overlay) {
        overlay.addEventListener("click", closePopup);
    }
}


function loadStudents() {
    const list = document.getElementById("student-list");
    list.classList.add("loading");

    fetchStudentsByClass(grade, classNum)
        .then(data => {
            list.classList.remove("loading");
            list.innerHTML = "";

            if (!Array.isArray(data)) {
                list.textContent = "데이터 형식이 올바르지 않습니다.";
                return;
            }

            // 해당 반 학생 필터링 (서버에서 이미 필터링되어 오지만 안전을 위해 유지)
            const filtered = data;

            // 학급 전체 기록 건수 합산
            const totalClassRecords = filtered.reduce((acc, s) => acc + (parseInt(s.recordCount) || 0), 0);
            const titleElement = document.getElementById("class-title");
            if (titleElement && grade && classNum) {
                titleElement.textContent = `${grade}학년 ${classNum}반 (${totalClassRecords}건)`;
            }

            // 번호순 정렬
            filtered.sort((a, b) => a["번호"] - b["번호"]);

            filtered.forEach(student => {
                const container = document.createElement("div");
                container.className = "student";

                // 학적 상태에 따른 스타일 (자퇴/전출 등)
                const status = student["학적"] || "";
                const isInactive = status === "자퇴" || status === "전출";
                if (isInactive) {
                    container.classList.add("inactive");
                }

                // 이미지 컨테이너 (배지 배치를 위해 추가)
                const imgContainer = document.createElement("div");
                imgContainer.className = "img-container";

                // 이미지 (Supabase photo_url 우선, 구글 드라이브 하위 호환)
                const img = document.createElement("img");
                const supabasePhotoUrl = student.photo_url;
                const driveLink = student["사진저장링크"] || "";
                const driveFileId = extractDriveId(driveLink || supabasePhotoUrl);

                if (supabasePhotoUrl && supabasePhotoUrl.startsWith('http')) {
                    img.src = supabasePhotoUrl;
                } else if (driveFileId) {
                    img.src = getThumbnailUrl(driveFileId);
                } else if (supabasePhotoUrl) {
                    // 파일명만 있는 경우 Supabase Public URL 구성 시도 (만약 경로가 정해져 있다면)
                    // 일단 구글 썸네일로 폴백 시도
                    img.src = `https://drive.google.com/thumbnail?id=${supabasePhotoUrl.split('.')[0]}&sz=w500`;
                } else {
                    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                }

                img.loading = "lazy";

                // 이미지 로드 실패 시 대체 경로 시도 (Fallback)
                img.onerror = function () {
                    if (this.getAttribute("data-retry")) {
                        this.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                        return;
                    }
                    this.setAttribute("data-retry", "true");
                    if (driveFileId) {
                        this.src = `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w500`;
                    }
                };

                imgContainer.appendChild(img);

                // [추가] 학적 상태 배지 (자퇴, 전출 등)
                if (status && status !== "재학") {
                    const statusBadge = document.createElement("div");
                    statusBadge.className = "status-badge";
                    statusBadge.textContent = status;
                    imgContainer.appendChild(statusBadge);
                }

                // [수정] 기록 건수 배지 (사진 위 우측 하단 배치)
                if (student.recordCount > 0) {
                    const recordBadge = document.createElement("div");
                    recordBadge.className = "record-badge";
                    recordBadge.textContent = student.recordCount;
                    imgContainer.appendChild(recordBadge);
                }

                // 이름 및 학번 표시
                const nameDiv = document.createElement("div");
                nameDiv.className = "student-name";

                // [수정] 번호 우선 표시 (학번 4자리 중 뒤 2자리 또는 번호 필드)
                // 사용자가 '번호'라고 부르는 것을 명확히 표시하기 위해 '번호' 필드가 있으면 그것을, 없으면 학번의 뒤 2자리를 사용
                let displayNum = student["번호"] || (student["학번"] ? String(student["학번"]).slice(-2) : "??");
                // 한 자리 숫자인 경우 앞에 0 붙임 (예: 1 -> 01)
                if (displayNum && !isNaN(displayNum) && String(displayNum).length === 1) {
                    displayNum = "0" + displayNum;
                }
                const studentName = student["이름"] || "이름없음";

                // 번호와 이름을 명확하게 span으로 감싸고 아이콘 제거
                nameDiv.innerHTML = `
                        <div class="name-badge">
                            <span class="student-num">${displayNum}</span>
                            <span class="student-nm">${studentName}</span>
                        </div>
                    `;

                container.appendChild(imgContainer);
                container.appendChild(nameDiv);

                // 롱 프레스 및 클릭 로직 구현
                let pressTimer;
                let isLongPress = false;

                const startPress = (e) => {
                    isLongPress = false;
                    container.classList.add("pressing");
                    pressTimer = setTimeout(() => {
                        isLongPress = true;
                        container.classList.remove("pressing");
                        container.classList.add("long-pressed");
                        // 진동 피드백 (지원되는 경우)
                        if (navigator.vibrate) navigator.vibrate(50);
                        showActionModal(student);
                    }, 600); // 600ms 동안 누르면 롱 프레스
                };

                const cancelPress = () => {
                    clearTimeout(pressTimer);
                    container.classList.remove("pressing");
                    container.classList.remove("long-pressed");
                };

                const handleRelease = (e) => {
                    clearTimeout(pressTimer);
                    container.classList.remove("pressing");
                    if (!isLongPress) {
                        // 짧게 클릭한 경우에만 팝업 표시
                        showPopup(student);
                    }
                    isLongPress = false;
                };

                // 마우스 이벤트
                container.addEventListener("mousedown", startPress);
                container.addEventListener("mouseup", handleRelease);
                container.addEventListener("mouseleave", cancelPress);

                // 터치 이벤트
                container.addEventListener("touchstart", (e) => {
                    // 기본 동작(스크롤 등)은 유지하면서 롱 프레스 체크
                    startPress(e);
                }, { passive: true });
                container.addEventListener("touchend", handleRelease);
                container.addEventListener("touchmove", cancelPress);

                list.appendChild(container);
            });

            if (filtered.length === 0) {
                list.textContent = "👀 해당 반의 데이터가 없습니다.";
            }
        })
        .catch(err => {
            const list = document.getElementById("student-list");
            if (list) list.textContent = "❌ 데이터를 불러올 수 없습니다.";
            console.error("Fetch Error:", err);
        });
}

// 팝업 관련 함수
// 팝업 관련 함수
async function showPopup(student) {
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    if (!popup || !overlay) return;

    overlay.style.display = "block";
    popup.style.display = "block";
    popup.className = "student-detail-popup";

    // 팝업 열 때 기초조사 데이터 추가 로딩
    let surveyData = {};
    try {
        const { data, error } = await supabase
            .from('surveys')
            .select('*')
            .eq('student_pid', student.pid)
            .maybeSingle();

        if (!error && data) {
            // 전체 컬럼과 JSONB 'data' 필드를 모두 병합하여 누락 방지
            surveyData = { ...data, ...(data.data || {}) };
        }
    } catch (e) {
        console.warn("Survey fetch error:", e);
    }

    // 이미지 소스 결정
    const supabasePhotoUrl = student.photo_url;
    const driveFileId = extractDriveId(student["사진저장링크"] || student.photo_url);

    let imgSrc = "";
    if (supabasePhotoUrl && supabasePhotoUrl.startsWith('http')) {
        imgSrc = supabasePhotoUrl;
    } else if (driveFileId) {
        imgSrc = getThumbnailUrl(driveFileId);
    }

    const fallbackImgSrc = driveFileId ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1000` : '';

    // 보여주지 않을 키 목록 (영문 기술용 필드 및 이미 매핑된 필드 제외)
    // 인스타 등은 api.js에서 한글로 매핑했으므로 원본 영문 필드는 숨김
    const technicalKeys = [
        "PID", "연번", "학년", "반", "파일명", "학생별시트", "사진저장링크", "입력시간", "submitted_at",
        "pid", "student_id", "photo_url", "photo_path", "created_at", "updated_at",
        "class_info", "academic_year", "name", "gender", "status", "contact",
        "birth_date", "parent_contact", "parent_relation", "email", "data", "id", "student_pid",
        "instagram", "insta", "sns", "social", "학생폰"
    ];

    // Q2: 기본 정보 분류 (인스타, 주소 포함)
    const basicKeys = ["번호", "성별", "학적", "연락처", "인스타", "인스타 아이디", "주소", "집주소", "학번", "생년월일", "SNS"];
    // Q3: 연락처 및 가족 분류 (보호자 중심)
    const contactKeys = ["보호자", "가족", "관계", "이메일", "폰", "전화"];

    let infoHtml2 = ""; // Q2
    let infoHtml3 = ""; // Q3
    let infoHtml4 = ""; // Q4

    const displayedKeys = new Set(); // 중복 항목(키 기준) 방지용

    const createInfoRow = (key, val) => {
        const valStr = String(val).trim();
        const lowKey = key.toLowerCase();

        // 전화번호/연락처 판단 ('번호' 필드는 통화 아이콘 제외)
        const isPhone = (key.includes("전화") || key.includes("연락처") || (key.includes("번호") && key !== "번호") || key.includes("폰"));
        // 인스타그램 판단 (insta, instagram, 인스타 포함 시)
        const isInsta = lowKey.includes("인스타") || lowKey.includes("insta");

        let displayVal = valStr;
        let displayKey = key;

        // 인스타용 특수 처리
        if (isInsta) {
            const cleanId = valStr.replace('@', '').trim();
            displayVal = `<a href="https://instagram.com/${cleanId}" target="_blank" style="color: #c13584; text-decoration: underline; font-weight: 800;">${valStr}</a>`;
            if (lowKey === "insta" || lowKey === "instagram") displayKey = "인스타 아이디";
        }

        return `<div class="detail-info-row">
            <span class="detail-label">${displayKey}</span>
            <span class="detail-value">
                ${displayVal} 
                ${isPhone ? `<a href="tel:${valStr}" class="contact-icon">📞</a><a href="sms:${valStr}" class="contact-icon">💬</a>` : ''} 
            </span>
        </div>`;
    };


    // 1. 학생 기본 테이블(students) 데이터 분류
    for (let key in student) {
        if (technicalKeys.includes(key) || key === "이름" || key === "학번") continue;

        const val = student[key];
        if (val === null || val === undefined || val === "") continue;

        const rowHtml = createInfoRow(key, val);

        // 분류 로직 (인스타/주소는 무조건 Q2)
        if (basicKeys.includes(key) || key.includes("인스타") || key.includes("주소")) {
            infoHtml2 += rowHtml;
        } else if (contactKeys.some(ck => key.includes(ck))) {
            infoHtml3 += rowHtml;
        } else {
            infoHtml4 += rowHtml;
        }
        displayedKeys.add(key);
    }

    // 2. 기초조사(surveys) 데이터 분류
    for (let key in surveyData) {
        // 이미 보여줬거나 기술용 키면 제외
        if (technicalKeys.includes(key) || displayedKeys.has(key)) continue;

        // 설문 조사용 공통 제외 키
        const surveyTechKeys = ["학년", "반", "번호", "이름", "학번", "비밀번호", "PID", "연번"];
        if (surveyTechKeys.includes(key)) continue;

        const val = surveyData[key];
        if (val === null || val === undefined || val === "") continue;

        const rowHtml = createInfoRow(key, val);

        // 인스타/주소 포함 항목은 무조건 Q2(기본정보)로 이동
        if (basicKeys.includes(key) || key.includes("인스타") || key.includes("주소")) {
            infoHtml2 += rowHtml;
        } else if (contactKeys.some(ck => key.includes(ck))) {
            infoHtml3 += rowHtml;
        } else {
            infoHtml4 += rowHtml;
        }
        displayedKeys.add(key);
    }


    const escapedStudent = JSON.stringify(student).replace(/"/g, '&quot;');
    const photoImg = imgSrc ? `<img src="${imgSrc}" onerror="this.src='${fallbackImgSrc}'" alt="${student["이름"]} 사진">` : `<div class="no-photo-placeholder">📷<br>사진 없음</div>`;

    popup.innerHTML = `
        <div class="popup-header">
            <h3><span class="popup-num">${student["학번"]}</span> ${student["이름"]}</h3>
            <button class="popup-record-btn" onclick="showRecord(${escapedStudent})">📒 생활기록 작성</button>
            <button class="popup-close-btn" onclick="closePopup()">✕</button>
        </div>
        <div class="popup-quadrants-container">
            <div class="popup-quadrant quad-1">
                <div class="quad-inner">
                    <div class="quad-label">사진</div>
                    <div class="photo-wrapper">${photoImg}</div>
                </div>
            </div>
            <div class="popup-quadrant quad-2">
                <div class="quad-inner">
                    <div class="quad-label">기본 정보</div>
                    <div class="quad-scroll">
                        ${infoHtml2 || '<div class="no-data-msg">-</div>'}
                    </div>
                </div>
            </div>
            <div class="popup-quadrant quad-3">
                <div class="quad-inner">
                    <div class="quad-label">연락처 및 가족</div>
                    <div class="quad-scroll">
                        ${infoHtml3 || '<div class="no-data-msg">-</div>'}
                    </div>
                </div>
            </div>
            <div class="popup-quadrant quad-4">
                <div class="quad-inner">
                    <div class="quad-label">상세 기초조사</div>
                    <div class="quad-scroll">
                        ${infoHtml4 || '<div class="no-data-msg">정보 없음</div>'}
                    </div>
                </div>
            </div>
        </div>
    `;



    // 팝업 열릴 때 전역 키보드 이벤트 리스너 등록
    window._popupKeyHandler = function (e) {
        if (popup.style.display === "block") {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                closePopup();
            }
        }
    };
    document.addEventListener("keydown", window._popupKeyHandler);
}

window.closePopup = function () {
    console.log("Close popup button clicked");
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    if (popup) {
        popup.style.display = "none";
        popup.className = "";
    }
    if (overlay) overlay.style.display = "none";

    if (window._popupKeyHandler) {
        document.removeEventListener("keydown", window._popupKeyHandler);
        window._popupKeyHandler = null;
    }
}

// 페이지 이동 및 모달 액션
window.showRecord = function (student) {
    const name = encodeURIComponent(student["이름"]);
    const num = encodeURIComponent(student["학번"]);
    window.location.href = `record.html?num=${num}&name=${name}`;
}

window.showActionModal = function (student) {
    const existing = document.getElementById("action-modal");
    if (existing) existing.remove();

    const displayNum = student["번호"] || (student["학번"] ? String(student["학번"]).slice(-2) : "??");

    const modal = document.createElement("div");
    modal.id = "action-modal";
    modal.className = "guidance-tooltip-overlay";
    modal.innerHTML = `
        <div class="guidance-tooltip-content" style="max-width: 350px;">
            <h3 style="margin-bottom: 20px;">[${displayNum}번] ${student["이름"]} 기록 메뉴</h3>
            
            <div class="action-grid" id="action-grid-main">
                <button class="action-btn" onclick="showRecord(${JSON.stringify(student).replace(/"/g, '&quot;')})">
                   <span class="action-icon">📒</span> 생활기록 작성
                </button>
                <button class="action-btn" onclick="openAttendanceModal(${JSON.stringify(student).replace(/"/g, '&quot;')})">
                   <span class="action-icon">🏃</span> 근태기록 (조퇴/외출)
                </button>
                <button class="action-btn" onclick="openStatusModal(${JSON.stringify(student).replace(/"/g, '&quot;')})">
                   <span class="action-icon">🪪</span> 학적상태 변경
                </button>
            </div>
            
            <div class="guidance-tooltip-footer" style="margin-top:20px;">
                <button class="close-tooltip-btn" onclick="this.closest('.guidance-tooltip-overlay').remove()">닫기</button>
            </div>
        </div>
    `;

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
};

window.openAttendanceModal = function (student) {
    const grid = document.getElementById("action-grid-main");
    if (!grid) return;

    grid.innerHTML = `
        <button class="action-btn" onclick="saveAttendance(${JSON.stringify(student).replace(/"/g, '&quot;')}, '조퇴')" style="background:#fff3cd; color:#856404; border-color:#ffeeba;">
           <span class="action-icon">🏃</span> 바로 조퇴 기록
        </button>
        <div class="action-input-group">
            <label>외출 기록 (시작 시간 ~ 종료 시간)</label>
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="time" id="out-start-time" required> 
                <span>~</span> 
                <input type="time" id="out-end-time" required>
            </div>
            <button class="action-submit-btn" onclick="saveAttendance(${JSON.stringify(student).replace(/"/g, '&quot;')}, '외출')">외출 기록 저장</button>
        </div>
    `;
};

window.saveAttendance = async function (student, type) {
    let detailMsg = type;
    if (type === '외출') {
        const start = document.getElementById('out-start-time').value;
        const end = document.getElementById('out-end-time').value;
        if (!start || !end) {
            alert("외출 시간을 모두 입력해주세요.");
            return;
        }
        detailMsg = `외출 (${start} ~ ${end})`;
    }

    if (!confirm(`[${student["이름"]}] 학생의 근태를 '${detailMsg}'(으)로 기록하시겠습니까?`)) return;

    const teacherPrefix = getStoredEmailPrefix();

    const formData = new FormData();
    formData.append("num", student["학번"]);
    formData.append("bad", "근태");
    formData.append("detail", detailMsg);
    formData.append("teacher", teacherPrefix);
    formData.append("time", new Date().toISOString());

    try {
        await saveRecord(formData);
        alert("기록되었습니다.");
        const modal = document.getElementById("action-modal");
        if (modal) modal.remove();
        // UI 리프레시 (건수 올리기 등) 필요 시 loadStudents 재호출
        loadStudents();
    } catch (e) {
        alert("기록 저장에 실패했습니다.");
        console.error(e);
    }
};

window.openStatusModal = function (student) {
    const grid = document.getElementById("action-grid-main");
    if (!grid) return;

    grid.innerHTML = `
        <div class="action-input-group">
            <label>변경할 학적/상태 선택</label>
            <select id="status-select">
                <option value="재학">재학 (기본)</option>
                <option value="전출">전출</option>
                <option value="전입">전입</option>
                <option value="자퇴">자퇴</option>
                <option value="위탁">위탁</option>
                <option value="숙려제">숙려제</option>
            </select>
            <button class="action-submit-btn" onclick="saveStatus(${JSON.stringify(student).replace(/"/g, '&quot;')})">학적상태 변경 저장</button>
        </div>
    `;
};

window.saveStatus = async function (student) {
    const newStatus = document.getElementById('status-select').value;
    if (!confirm(`[${student["이름"]}] 학생의 상태를 '${newStatus}'(으)로 변경하시겠습니까?`)) return;

    try {
        const { error } = await supabase
            .from('students')
            .update({ status: newStatus })
            .eq('student_id', student["학번"]);

        if (error) throw error;

        alert("상태가 변경되었습니다.");
        const modal = document.getElementById("action-modal");
        if (modal) modal.remove();
        // 목록 다시 불러와서 UI(비활성화 딤처리, 배지 등) 갱신
        loadStudents();
    } catch (e) {
        alert("상태 변경에 실패했습니다.");
        console.error(e);
    }
};

function goToRelativeClass(direction) {
    let g = grade || 1;
    let c = classNum || 1;

    c += direction;
    if (c < 1) {
        c = 6;
        g--;
    } else if (c > 6) {
        c = 1;
        g++;
    }

    if (g < 1) g = 3;
    if (g > 3) g = 1;

    window.location.href = `stu-list.html?grade=${g}&class=${c}`;
}

function goHome() {
    window.location.href = "index.html";
}

// 서비스 워커 등록
function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker
            .register("/service-worker.js")
            .then(() => console.log("[SW] Service worker registered successfully."))
            .catch(err => console.error("[SW] Registration failed:", err));
    }
}
