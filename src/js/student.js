import { API_CONFIG } from './config.js';
import { extractDriveId, getThumbnailUrl } from './utils.js';
import { fetchStudentsByClass, fetchClassInfo, saveRecord, fetchDetailedRecordCounts } from './api.js';
import { supabase } from './supabase.js';
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'oneclass25-secret-auth-key';

function getStoredEmailPrefix() {
    const encrypted = localStorage.getItem('teacher_auth_token');
    if (!encrypted) return "교사";
    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
        const email = bytes.toString(CryptoJS.enc.Utf8);
        return email ? maskEmailPrefix(email.split('@')[0]) : "교사";
    } catch (e) {
        return "교사";
    }
}

/**
 * 이메일 마스킹 처리 (앞 3글자 + 도메인 유지)
 */
function maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [prefix, domain] = email.split('@');
    if (prefix.length <= 3) return prefix + '@' + domain;
    return prefix.substring(0, 3) + '*'.repeat(prefix.length - 3) + '@' + domain;
}

/**
 * 이메일 아이디 마스킹 (두 글자 제외 마스킹)
 */
function maskEmailPrefix(prefix) {
    if (!prefix) return "";
    if (prefix.length >= 2) {
        return prefix.substring(0, 2) + '*'.repeat(prefix.length - 2);
    }
    return prefix.substring(0, 1) + '*';
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
    setupEventListeners(classInfo);

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
        // 교사 이름 클릭 시 즉시 전화 연결로 변경 (사용자 요청)
        const hrPhone = info.homeroomPhone || "";
        const subPhone = info.subPhone || "";

        teacherInfoElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center;">
                <button class="teacher-contact-btn" onclick="if('${hrPhone}') window.location.href='tel:${hrPhone}'; else alert('연락처가 등록되지 않았습니다.');">
                    <span class="teacher-badge homeroom">담임</span>
                    <span class="teacher-name">${info.homeroom}</span>
                </button>
                ${info.sub ? `
                <button class="teacher-contact-btn" onclick="if('${subPhone}') window.location.href='tel:${subPhone}'; else alert('연락처가 등록되지 않았습니다.');">
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


function getFullStoredEmail() {
    const encrypted = localStorage.getItem('teacher_auth_token');
    if (!encrypted) return "";
    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        return "";
    }
}

function setupEventListeners(classInfo) {
    // 플로팅 컨트롤 (네비게이션)
    const prevBtn = document.getElementById("prev-btn");
    const homeBtn = document.getElementById("home-btn");
    const surveyBtn = document.getElementById("survey-viewer-btn");
    const nextBtn = document.getElementById("next-btn");

    const handleNavClick = (e, direction) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        goToRelativeClass(direction);
    };

    if (prevBtn) {
        prevBtn.addEventListener("click", (e) => handleNavClick(e, -1));
        prevBtn.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: false });
        prevBtn.addEventListener("touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNavClick(null, -1);
        }, { passive: false });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", (e) => handleNavClick(e, 1));
        nextBtn.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: false });
        nextBtn.addEventListener("touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNavClick(null, 1);
        }, { passive: false });
    }

    if (homeBtn) {
        homeBtn.addEventListener("click", goHome);
    }

    // [수정] 본인 담임반일 때만 기초조사 모아보기 버튼 노출
    if (surveyBtn) {
        const myEmail = getFullStoredEmail();
        const currentClassInfo = classInfo ? classInfo.find(c => c.grade === grade && c.class === classNum) : null;

        const isMyClass = currentClassInfo && (currentClassInfo.homeroomEmail === myEmail || currentClassInfo.subEmail === myEmail);

        if (isMyClass) {
            surveyBtn.style.display = "flex";
            surveyBtn.addEventListener("click", () => {
                window.location.href = `class-analysis.html?grade=${grade}&class=${classNum}`;
            });
        } else {
            surveyBtn.style.display = "none";
        }
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

    const classKey = `${grade}-${classNum}`;

    Promise.all([
        fetchStudentsByClass(grade, classNum),
        fetchDetailedRecordCounts(classKey)
    ])
        .then(([data, detailedCounts]) => {
            list.classList.remove("loading");
            list.innerHTML = "";

            if (!Array.isArray(data)) {
                list.textContent = "데이터 형식이 올바르지 않습니다.";
                return;
            }

            // 해당 반 학생 필터링
            const filtered = data;

            // 학급 전체 기록 건수 합산
            const totalClassRecords = filtered.reduce((acc, s) => acc + (parseInt(s.recordCount) || 0), 0);
            const titleElement = document.getElementById("class-title");
            if (titleElement && grade && classNum) {
                titleElement.innerHTML = `${grade}학년 ${classNum}반 <span style="font-size: 0.65em; color: #64748b; font-weight: 500; margin-left: 6px;">(${totalClassRecords}건)</span>`;
            }

            // 번호순 정렬
            filtered.sort((a, b) => a["번호"] - b["번호"]);

            // [추가] 전역 캐시에 저장 (팝업 이동용)
            window.allStudents_Cache = filtered;

            filtered.forEach((student, index) => {
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
                    img.src = `https://drive.google.com/thumbnail?id=${supabasePhotoUrl.split('.')[0]}&sz=w500`;
                } else {
                    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                }

                img.loading = "lazy";

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

                // [추가] 학적 상태 배지 (자퇴, 전출, 졸업, 숙려제 등)
                if (status && status !== "재학") {
                    const statusBadge = document.createElement("div");
                    statusBadge.className = "status-badge";

                    if (status.startsWith("숙려제")) {
                        // 숙려제|시작일|종료일 형식 파싱
                        const parts = status.split('|');
                        const startDate = parts[1];
                        const endDate = parts[2];

                        if (startDate && endDate) {
                            const now = new Date();
                            now.setHours(0, 0, 0, 0);
                            const start = new Date(startDate);
                            const end = new Date(endDate);
                            end.setHours(23, 59, 59, 999);

                            if (now >= start && now <= end) {
                                statusBadge.classList.add("cooling-off");
                                statusBadge.textContent = "숙려제";
                                imgContainer.appendChild(statusBadge);
                            }
                        }
                    } else if (status === "graduated") {
                        statusBadge.classList.add("graduated");
                        statusBadge.textContent = "졸업";
                        imgContainer.appendChild(statusBadge);
                    } else {
                        statusBadge.textContent = status;
                        imgContainer.appendChild(statusBadge);
                    }
                }

                // [수정] 상세 기록 건수 배지 (3색 분리 표시: 파랑(잘한일)-검정(일반)-빨강(지도))
                const counts = detailedCounts[student.pid] || { good: 0, normal: 0, bad: 0 };
                if (counts.good > 0 || counts.normal > 0 || counts.bad > 0) {
                    const recordBadge = document.createElement("div");
                    recordBadge.className = "record-badge-multi";

                    let badgeHtml = "";
                    // 요청 순서: 잘한일(파랑) -> 일반(검정) -> 잘못한일(빨강)
                    if (counts.good > 0) badgeHtml += `<span class="badge-good">${counts.good}</span>`;
                    if (counts.normal > 0) badgeHtml += `<span class="badge-normal">${counts.normal}</span>`;
                    if (counts.bad > 0) badgeHtml += `<span class="badge-bad">${counts.bad}</span>`;

                    recordBadge.innerHTML = badgeHtml;
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

                // 롱 프레스 및 클릭 로직 구현 (고스트 터치 완벽 방지)
                let pressTimer;
                let isLongPress = false;
                let moved = false;
                let startX, startY;

                const onStart = (e) => {
                    const touch = e.type.indexOf('touch') === 0 ? e.touches[0] : e;
                    startX = touch.clientX;
                    startY = touch.clientY;
                    moved = false;
                    isLongPress = false;

                    container.classList.add("pressing");
                    clearTimeout(pressTimer);
                    pressTimer = setTimeout(() => {
                        isLongPress = true;
                        container.classList.remove("pressing");
                        container.classList.add("long-pressed");
                        if (navigator.vibrate) navigator.vibrate(50);
                        showActionModal(student);
                    }, 600);
                };

                const onMove = (e) => {
                    if (!startX || !startY) return;
                    const touch = e.type.indexOf('touch') === 0 ? e.touches[0] : e;
                    const dx = Math.abs(touch.clientX - startX);
                    const dy = Math.abs(touch.clientY - startY);

                    // 8px 이상 움직이면 드래그로 간주
                    if (dx > 8 || dy > 8) {
                        moved = true;
                        clearTimeout(pressTimer);
                        container.classList.remove("pressing");
                    }
                };

                const onEnd = (e) => {
                    if (!startX || !startY) return; // 해당 요소에서 시작하지 않았으면 무시
                    clearTimeout(pressTimer);
                    container.classList.remove("pressing");
                    container.classList.remove("long-pressed");

                    // 롱프레스가 아니었고, 드래그도 아니었을 경우에만 팝업 표시
                    if (!isLongPress && !moved) {
                        // touchend에서만 호출하여 mouseup과의 중복(고스트 터치) 방지
                        if (e.type === 'touchend') {
                            e.preventDefault();
                            showPopup(student);
                        } else if (e.type === 'mouseup' && e.which === 1) {
                            // 터치 기기가 아닐 때만 mouseup으로 처리
                            showPopup(student);
                        }
                    }
                    startX = startY = null;
                };

                // 이벤트 등록
                container.addEventListener("mousedown", onStart);
                container.addEventListener("mousemove", onMove);
                container.addEventListener("mouseup", onEnd);

                // 마우스가 요소를 벗어나면 타이머 취소
                container.addEventListener("mouseleave", () => {
                    clearTimeout(pressTimer);
                    container.classList.remove("pressing");
                    container.classList.remove("long-pressed");
                    startX = startY = null;
                });

                container.addEventListener("touchstart", onStart, { passive: false });
                container.addEventListener("touchmove", onMove, { passive: true });
                container.addEventListener("touchend", onEnd, { passive: false });

                // 우클릭 이벤트 (PC)
                container.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    showActionModal(student);
                });

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

// 최적의 값을 찾기 위한 헬퍼 함수 (다양한 키 형태 지원)
function getValue(obj1, obj2, ...keys) {
    const combined = { ...obj1, ...obj2 };
    for (let key of keys) {
        if (combined[key] !== undefined && combined[key] !== null && String(combined[key]).trim() !== "") {
            return String(combined[key]).trim();
        }
        // 대문자 체크
        const upper = key.toUpperCase();
        if (combined[upper] !== undefined && combined[upper] !== null && String(combined[upper]).trim() !== "") {
            return String(combined[upper]).trim();
        }
        // 공백 제거 버전 체크
        const noSpace = key.replace(/\s/g, "");
        if (combined[noSpace] !== undefined && combined[noSpace] !== null && String(combined[noSpace]).trim() !== "") {
            return String(combined[noSpace]).trim();
        }
    }
    return "";
}

// 친밀도 수치 -> 한글 텍스트 매핑
const intimacyMap = {
    "1": "매우 소원함",
    "2": "소원함",
    "3": "보통",
    "4": "친밀함",
    "5": "매우 친밀함"
};

// 팝업 관련 함수
async function showPopup(student) {
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    if (!popup || !overlay) return;

    overlay.style.display = "block";
    popup.style.display = "block";
    popup.className = "student-detail-popup";

    // 배경 스크롤 방지
    document.body.style.overflow = "hidden";

    // 옆반 이동 버튼 숨기기
    const floatingControls = document.querySelector(".floating-controls");
    if (floatingControls) floatingControls.style.display = "none";

    // 팝업 열 때 기초조사 데이터 추가 로딩
    let surveyRaw = {};
    try {
        const { data, error } = await supabase
            .from('surveys')
            .select('*')
            .eq('student_pid', student.pid)
            .maybeSingle();

        if (!error && data) {
            surveyRaw = { ...data, ...(data.data || {}) };
        }
    } catch (e) {
        console.warn("Survey fetch error:", e);
    }

    const surveyData = {};
    // 모든 키를 대문자로 정규화한 객체도 준비 (매칭 확률 높임)
    for (let k in surveyRaw) {
        surveyData[k] = surveyRaw[k];
        surveyData[k.toUpperCase()] = surveyRaw[k];
    }

    const supabasePhotoUrl = student.photo_url;
    const driveFileId = extractDriveId(student["사진저장링크"] || student.photo_url);
    let imgSrc = "";
    if (supabasePhotoUrl && supabasePhotoUrl.startsWith('http')) {
        imgSrc = supabasePhotoUrl;
    } else if (driveFileId) {
        imgSrc = getThumbnailUrl(driveFileId);
    }
    const fallbackImgSrc = driveFileId ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1000` : '';

    const createInfoRow = (label, val) => {
        let valStr = String(val || "").trim();
        if (valStr === "" || valStr === "null" || valStr === "undefined" || valStr === "없음") {
            valStr = ".";
        }

        const lowLabel = label.toLowerCase();

        // 친밀도 수치 -> 텍스트 변환
        let displayVal = valStr;
        if (label.includes("친밀도") && intimacyMap[valStr]) {
            displayVal = intimacyMap[valStr];
        }

        const isPhone = (label.includes("전화") || label.includes("연락처") || (label.includes("번호") && label !== "번호" && label !== "학번") || label.includes("폰"));
        const isInsta = lowLabel.includes("인스타") || lowLabel.includes("insta");

        if (isInsta && valStr !== ".") {
            const cleanId = valStr.replace('@', '').trim();
            displayVal = `<a href="https://instagram.com/${cleanId}" target="_blank" style="color: #c13584; text-decoration: underline; font-weight: 800;">${valStr}</a>`;
        }

        return `<div class="detail-info-row">
            <span class="detail-label">${label}</span>
            <span class="detail-value">
                ${displayVal} 
                ${(isPhone && valStr !== ".") ? `<a href="tel:${valStr}" class="contact-icon">📞</a>` : ''} 
            </span>
        </div>`;
    };

    // 2사분면: 기본 정보 (순서: 연락처, 인스타, 집주소, 학적, 성별)
    let infoHtml2 = "";
    infoHtml2 += createInfoRow("연락처", getValue(student, surveyData, "연락처", "contact", "학생폰", "학생 연락처"));
    infoHtml2 += createInfoRow("인스타", getValue(student, surveyData, "인스타", "instagram", "insta", "인스타 아이디", "SNS"));
    infoHtml2 += createInfoRow("집주소", getValue(student, surveyData, "주소", "집주소", "address"));
    infoHtml2 += createInfoRow("학적", getValue(student, surveyData, "학적", "status"));
    infoHtml2 += createInfoRow("성별", getValue(student, surveyData, "성별", "gender"));

    // 3사분면: 연락처 및 가족 (순서: 주보호자 관계, 주보호자 연락처, 주보호자 친밀도, 보조보호자 관계, 보조보호자 연락처, 보조보호자 친밀도, 거주가족)
    let infoHtml3 = "";
    infoHtml3 += createInfoRow("주보호자 관계", getValue(surveyData, {}, "주보호자 관계", "보호자관계", "PARENT_RELATION"));
    infoHtml3 += createInfoRow("주보호자 연락처", getValue(surveyData, {}, "주보호자 연락처", "보호자연락처", "PARENT_CONTACT"));
    infoHtml3 += createInfoRow("주보호자 친밀도", getValue(surveyData, {}, "주보호자 친밀도", "친밀도"));
    infoHtml3 += createInfoRow("보조보호자 관계", getValue(surveyData, {}, "보조보호자 관계"));
    infoHtml3 += createInfoRow("보조보호자 연락처", getValue(surveyData, {}, "보조보호자 연락처"));
    infoHtml3 += createInfoRow("보조보호자 친밀도", getValue(surveyData, {}, "보조보호자 친밀도"));
    infoHtml3 += createInfoRow("거주가족", getValue(surveyData, {}, "거주가족", "가족구성"));

    // 4사분면: 상세 기초조사 (나머지 설문 데이터)
    let infoHtml4 = "";
    const usedKeys = [
        "번호", "연락처", "인스타", "집주소", "학적", "성별", "학번", "student_id", "contact", "instagram", "insta", "인스타 아이디", "주소", "집주소", "address", "status", "gender",
        "주보호자 관계", "주보호자 연락처", "주보호자 친밀도", "보조보호자 관계", "보조보호자 연락처", "보조보호자 친밀도", "거주가족", "SNS", "학생폰", "학생 연락처",
        "보호자연락처", "보호자관계", "PARENT_RELATION", "PARENT_CONTACT", "가족구성", "친밀도", "보호자 연락처",
        "주보호자연락처", "보조보호자연락처", "주보호자친밀도", "보조보호자친밀도"
    ];
    const techKeys = [
        "학년", "반", "이름", "PID", "연번", "submitted_at", "pid", "photo_url", "photo_path", "created_at", "updated_at", "data", "id", "student_pid", "비밀번호", "사진저장링크", "연번", "파일명", "학생별시트", "입력시간", "ACADEMIC_YEAR", "CLASS_INFO", "NAME"
    ];

    const allSurveyKeys = Object.keys(surveyRaw);
    allSurveyKeys.forEach(k => {
        const uk = k.toUpperCase();
        const isInUsed = usedKeys.some(key => key.toUpperCase() === uk);
        const isInTech = techKeys.some(key => key.toUpperCase() === uk);
        if (isInUsed || isInTech) return;

        const val = surveyRaw[k];
        if (val && String(val).trim()) {
            infoHtml4 += createInfoRow(k, val);
        }
    });

    const escapedStudent = JSON.stringify(student).replace(/"/g, '&quot;');
    const photoImg = imgSrc ? `<img src="${imgSrc}" onerror="this.src='${fallbackImgSrc}'" alt="${student["이름"]} 사진">` : `<div class="no-photo-placeholder">📷<br>사진 없음</div>`;

    // 현재 반 학생들 목록 가져오기 (이동 버튼용)
    const studentsInClass = Array.from(document.querySelectorAll('.student')).map(el => {
        // 이 부분은 loadStudents에서 데이터를 전역 변수에 담아두는 것이 좋지만, 
        // 현재 구조를 유지하며 DOM에서 데이터를 유추하거나 다시 fetch하는 대신 
        // 간단한 인덱스 기반 이동을 위해 popup 호출 시 index를 넘겨받는 식으로 개선할 수 있습니다.
        // 여기서는 student 객체 자체를 사용하여 이전/다음 번호를 찾습니다.
        return null; // 나중에 보완
    });

    popup.innerHTML = `
        <div class="popup-header">
            <div class="popup-title-center">
                <span class="student-id-badge">${student["학번"]}</span>
                <span class="student-name-text">${student["이름"]}</span>
                <button class="popup-record-btn" onclick="showRecord(${escapedStudent})">📒 생활기록 작성</button>
            </div>
            <button class="close-btn" onclick="closePopup()">✕</button>
        </div>
        
        <div class="popup-content-layout">
            <!-- 왼쪽 이동 버튼 -->
            <button class="nav-arrow-btn left" id="popup-prev-btn">
                <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>

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

            <!-- 오른쪽 이동 버튼 -->
            <button class="nav-arrow-btn right" id="popup-next-btn">
                <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>
        </div>
    `;

    // 이동 버튼 이벤트 바인딩
    setupPopupNavigation(student);

    // 팝업 열릴 때 전역 키보드 이벤트 리스너 등록
    window._popupKeyHandler = function (e) {
        if (popup.style.display === "block") {
            if (e.key === "Escape") {
                e.preventDefault();
                closePopup();
            } else if (e.key === "ArrowLeft") {
                document.getElementById("popup-prev-btn")?.click();
            } else if (e.key === "ArrowRight") {
                document.getElementById("popup-next-btn")?.click();
            }
        }
    };
    document.addEventListener("keydown", window._popupKeyHandler);
}

// 팝업 내 번호 이동 로직 완성
function setupPopupNavigation(currentStudent) {
    const prevBtn = document.getElementById("popup-prev-btn");
    const nextBtn = document.getElementById("popup-next-btn");
    if (!prevBtn || !nextBtn || !window.allStudents_Cache) return;

    const currentIndex = window.allStudents_Cache.findIndex(s => s.pid === currentStudent.pid);
    if (currentIndex === -1) return;

    // 이전 학생
    if (currentIndex > 0) {
        prevBtn.onclick = () => {
            const prevStudent = window.allStudents_Cache[currentIndex - 1];
            showPopup(prevStudent);
        };
    } else {
        prevBtn.style.visibility = "hidden";
    }

    // 다음 학생
    if (currentIndex < window.allStudents_Cache.length - 1) {
        nextBtn.onclick = () => {
            const nextStudent = window.allStudents_Cache[currentIndex + 1];
            showPopup(nextStudent);
        };
    } else {
        nextBtn.style.visibility = "hidden";
    }
}

window.closePopup = function () {
    console.log("Close popup button clicked");
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");

    // 배경 스크롤 해제
    document.body.style.overflow = "";

    if (popup) {
        popup.style.display = "none";
        popup.className = "";
    }
    if (overlay) overlay.style.display = "none";

    if (window._popupKeyHandler) {
        document.removeEventListener("keydown", window._popupKeyHandler);
        window._popupKeyHandler = null;
    }

    // 옆반 이동 버튼 다시 보이기
    const floatingControls = document.querySelector(".floating-controls");
    if (floatingControls) floatingControls.style.display = "flex";
}

// 페이지 이동 및 모달 액션
window.showRecord = function (student) {
    const name = encodeURIComponent(student["이름"]);
    const num = encodeURIComponent(student["학번"]);
    window.location.href = `record.html?num=${num}&name=${name}`;
}

window.showCounsel = function (student) {
    const name = encodeURIComponent(student["이름"]);
    const num = encodeURIComponent(student["학번"]);
    window.location.href = `record.html?num=${num}&name=${name}&mode=counsel`;
}

window.goToAnalysis = function (student) {
    const sid = encodeURIComponent(student["학번"]);
    window.location.href = `analysis.html?sid=${sid}`;
}

window.showActionModal = function (student) {
    const existing = document.getElementById("action-modal");
    if (existing) existing.remove();

    const displayNum = student["번호"] || (student["학번"] ? String(student["학번"]).slice(-2) : "??");

    const modal = document.createElement("div");
    modal.id = "action-modal";
    modal.className = "guidance-tooltip-overlay";
    modal.innerHTML = `
        <div class="guidance-tooltip-content" style="background: white; width: 95%; max-width: 480px; border-radius: 32px; padding: 30px 20px 25px; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
            <!-- 상단 타이틀 및 X 버튼 통합 헤더 -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 25px; padding: 0 40px; position: relative;">
                <h2 id="action-modal-title" style="font-size: 1.4rem; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -1px; text-align: center;">
                    [${displayNum}번] ${student["이름"]} 기록 메뉴
                </h2>
                <!-- 상단 X 닫기 버튼 -->
                <button onclick="this.closest('.guidance-tooltip-overlay').remove()" style="position: absolute; right: 0; background: #f1f5f9; border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; color: #64748b; cursor: pointer; transition: all 0.2s; z-index: 10;">✕</button>
            </div>
            
            <div id="action-grid-main" style="display: flex; flex-direction: column; gap: 12px;">
                <button class="action-btn" onclick="goToAnalysis(${JSON.stringify(student).replace(/"/g, '&quot;')})" style="background:#f0f7ff; border-color:#cce4f7; color:#0f52ba;">
                   <span class="action-icon">🧠</span> 학생 분석
                </button>
                <button class="action-btn" onclick="showCounsel(${JSON.stringify(student).replace(/"/g, '&quot;')})" style="background:#fff9db; border-color:#ffe066; color:#e67e22;">
                   <span class="action-icon">💬</span> 상담 기록 작성
                </button>
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
        </div>
    `;

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
};

window.openAttendanceModal = function (student) {
    const grid = document.getElementById("action-grid-main");
    if (!grid) return;

    // 타이틀 변경
    const titleEl = document.getElementById("action-modal-title");
    if (titleEl) {
        const displayNum = student["번호"] || (student["학번"] ? String(student["학번"]).slice(-2) : "??");
        titleEl.textContent = `[${displayNum}번] ${student["이름"]} 조퇴/외출 기록`;
    }

    grid.innerHTML = `
        <div class="attendance-input-card" style="background: #f8fafc; padding: 25px 15px; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px; width: 100%;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <!-- 조퇴/외출 토글 (중앙 배치) -->
                <div class="attendance-type-toggle" id="attendance-type-toggle" data-current="외출" style="display: flex; background: #e2e8f0; padding: 4px; border-radius: 12px; height: 52px; width: 240px; cursor: pointer; position: relative;">
                    <div class="type-slider" style="position: absolute; top: 4px; left: 4px; width: 116px; height: 44px; background: white; border-radius: 10px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
                    <div class="type-option active" data-value="외출" style="flex:1; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 800; z-index: 1; color: #1e293b; text-align: center;">외출</div>
                    <div class="type-option" data-value="조퇴" style="flex:1; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 800; z-index: 1; color: #64748b; text-align: center;">조퇴</div>
                </div>
            </div>
            
            <div class="attendance-input-grid" style="display: flex; gap: 15px;">
                <!-- 시작 시간 그룹 -->
                <div class="attendance-input-col" style="flex:1;">
                    <div class="attendance-input-label">시작 시간</div>
                    <div class="ampm-toggle-container" id="ampm-toggle" data-current="오전" style="margin-bottom: 8px; width: 100%; height: 47px;">
                        <div class="ampm-toggle-slider" style="border-radius: 12px;"></div>
                        <div class="ampm-toggle-option active" data-value="오전" style="font-size: 0.95rem;">오전</div>
                        <div class="ampm-toggle-option" data-value="오후" style="font-size: 0.95rem;">오후</div>
                    </div>
                    <!-- 시작 시간 퀵 버튼 추가 -->
                    <div style="display: flex; flex-direction: column; gap: 2px; margin-bottom: 6px; width: 100%;">
                        <div class="time-quick-group" style="display: flex; gap: 4px; width: 100%;">
                            <button class="time-quick-btn" onclick="adjustTime('out-start-time', 'SET_ZERO')" style="flex:1; height: 47px; font-size: 0.9rem; border-radius: 10px;">정각</button>
                            <button class="time-quick-btn" onclick="adjustTime('out-start-time', 10)" style="flex:1; height: 47px; font-size: 0.9rem; border-radius: 10px;">+10분</button>
                            <button class="time-quick-btn" onclick="adjustTime('out-start-time', -10)" style="flex:1; height: 47px; font-size: 0.9rem; border-radius: 10px;">-10분</button>
                        </div>
                        <div class="time-quick-group" style="display: flex; gap: 4px; width: 100%;">
                            <button class="time-quick-btn" onclick="adjustTime('out-start-time', 60)" style="flex:1; height: 47px; font-size: 0.9rem; border-radius: 10px;">+1시간</button>
                            <button class="time-quick-btn" onclick="adjustTime('out-start-time', -60)" style="flex:1; height: 47px; font-size: 0.9rem; border-radius: 10px;">-1시간</button>
                        </div>
                    </div>
                    <input type="time" id="out-start-time" class="no-ampm-input" style="width:100%; padding:14px; border-radius:16px; border:1.5px solid #e2e8f0; font-family:inherit; font-size:1.3rem; text-align:center; background: #ffffff; font-weight: 800; color: #1e293b;" required> 
                </div>
                
                <div style="padding-bottom:18px; color:#cbd5e1; font-weight:900; font-size: 1.2rem;">~</div>
                
                <!-- 종료 시간 그룹 (조퇴 시 숨김 처리 고려) -->
                <div class="attendance-input-col" id="end-time-section" style="flex:1;">
                    <div class="attendance-input-label">종료 시간</div>
                    <div class="time-quick-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px; width: 100%; margin-top: 55px;">
                        <button class="time-quick-btn" onclick="adjustTime('out-end-time', 30)" style="height: 47px; font-size: 0.9rem; border-radius: 10px; line-height: 1.2;">+30분</button>
                        <button class="time-quick-btn" onclick="adjustTime('out-end-time', -30)" style="height: 47px; font-size: 0.9rem; border-radius: 10px; line-height: 1.2;">-30분</button>
                        <button class="type-dependent-btn" onclick="adjustTime('out-end-time', 60)" style="height: 47px; font-size: 0.9rem; border-radius: 10px; background:white; border:1px solid #e2e8f0; color:#475569; line-height: 1.2;">+1시간</button>
                        <button class="type-dependent-btn" onclick="adjustTime('out-end-time', -60)" style="height: 47px; font-size: 0.9rem; border-radius: 10px; background:white; border:1px solid #e2e8f0; color:#475569; line-height: 1.2;">-1시간</button>
                    </div>
                    <input type="time" id="out-end-time" class="no-ampm-input" style="width:100%; padding:14px; border-radius:16px; border:1.5px solid #e2e8f0; font-family:inherit; font-size:1.3rem; text-align:center; background: #ffffff; font-weight: 800; color: #1e293b;" required>
                </div>
            </div>
        </div>

        <button id="attendance-submit-btn" class="action-submit-btn" onclick="saveAttendance(${JSON.stringify(student).replace(/"/g, '&quot;')})" style="background: #3b82f6; margin-top: 10px; font-weight: 800; font-size: 1.25rem;">
            🏃 외출 기록 저장
        </button>
    `;

    // 현재 시간 세팅 (시작 시간 기본값)
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('out-start-time').value = `${hh}:${mm}`;

    // 오전/오후 토글 로직
    const ampmToggle = document.getElementById("ampm-toggle");
    const ampmOptions = ampmToggle.querySelectorAll(".ampm-toggle-option");

    let currentAmPm = "오전";

    ampmToggle.onclick = (e) => {
        currentAmPm = (currentAmPm === "오전") ? "오후" : "오전";
        ampmToggle.classList.toggle("pm", currentAmPm === "오후");
        ampmOptions.forEach(opt => {
            opt.classList.toggle("active", opt.getAttribute("data-value") === currentAmPm);
        });
        ampmToggle.setAttribute("data-current", currentAmPm);

        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(8);
        }
    };

    // 조퇴/외출 토글 로직
    const typeToggle = document.getElementById("attendance-type-toggle");
    const typeOptions = typeToggle.querySelectorAll(".type-option");
    const typeSlider = typeToggle.querySelector(".type-slider");
    const endTimeSection = document.getElementById("end-time-section");
    const submitBtn = document.getElementById("attendance-submit-btn");

    const updateAttendanceTypeUI = (type) => {
        typeOptions.forEach(opt => {
            const isActive = opt.getAttribute("data-value") === type;
            opt.classList.toggle("active", isActive);
            opt.style.color = isActive ? '#1e293b' : '#64748b';
        });
        typeSlider.style.transform = type === "조퇴" ? "translateX(100%)" : "translateX(0)";
        typeToggle.setAttribute("data-current", type);

        if (type === "조퇴") {
            endTimeSection.style.display = "none";
            submitBtn.innerHTML = `🏠 조퇴 기록 저장`;
            submitBtn.style.background = "#fefce8";
            submitBtn.style.color = "#a16207";
            submitBtn.style.borderColor = "#fef08a";
            submitBtn.style.boxShadow = "0 2px 4px rgba(254, 240, 138, 0.2)";
        } else {
            endTimeSection.style.display = "block";
            submitBtn.innerHTML = `🏃 외출 기록 저장`;
            submitBtn.style.background = "#3b82f6";
            submitBtn.style.color = "white";
            submitBtn.style.borderColor = "transparent";
            submitBtn.style.boxShadow = "0 12px 24px rgba(0, 122, 255, 0.25)";
        }
    };

    typeToggle.onclick = (e) => {
        const currentType = typeToggle.getAttribute("data-current");
        const newType = currentType === "외출" ? "조퇴" : "외출";
        updateAttendanceTypeUI(newType);
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(8);
        }
    };

    // 초기 UI 설정 (기본값 '외출')
    updateAttendanceTypeUI(typeToggle.getAttribute("data-current"));
};

// 시간 가산/설정 함수
window.adjustTime = function (inputId, minutesToAdd) {
    const input = document.getElementById(inputId);
    const startTimeInput = document.getElementById('out-start-time');

    // 사용자가 입력칸을 직접 수정했을 수 있으므로, 매 클릭 시 최신 값을 즉시 파싱합니다.
    let baseTimeStr = input.value;

    // 만약 종료 시간(input)이 비어있다면, 현재 설정된 시작 시간을 기준으로 계산합니다.
    if (!baseTimeStr) {
        baseTimeStr = startTimeInput.value;
    }

    // 만약 시작 시간도 없다면 현재 시각을 기준으로 합니다.
    if (!baseTimeStr) {
        const now = new Date();
        baseTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} `;
    }

    let [hours, minutes] = baseTimeStr.split(':').map(Number);

    if (minutesToAdd === 'SET_ZERO') {
        // '정각' 요청: 분이 0이면 그대로, 0보다 크면 다음 시 00분으로 올림
        if (minutes > 0) {
            hours = (hours + 1) % 24;
        }
        minutes = 0;
    } else {
        // 일반 가산 요청
        const date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes + minutesToAdd);
        hours = date.getHours();
        minutes = date.getMinutes();
    }

    const newHH = String(hours).padStart(2, '0');
    const newMM = String(minutes).padStart(2, '0');
    input.value = `${newHH}:${newMM}`;
};

window.saveAttendance = async function (student) {
    const typeToggle = document.getElementById('attendance-type-toggle');
    const selectedType = typeToggle ? typeToggle.getAttribute('data-current') : '외출';

    const start = document.getElementById('out-start-time').value;
    const end = document.getElementById('out-end-time').value;
    const ampm = document.getElementById('ampm-toggle')?.getAttribute("data-current") || "";

    let detailMsg = "";
    if (selectedType === '조퇴') {
        if (!start) {
            window.showToast("조퇴 시간을 입력해주세요.", "error");
            return;
        }
        detailMsg = `${ampm} 조퇴(${start}~)`;
    } else { // 외출
        if (!start || !end) {
            window.showToast("외출 시간을 모두 입력해주세요.", "error");
            return;
        }

        // 시간 유효성 검사 (외출 시에만)
        const startVal = start.replace(':', '');
        const endVal = end.replace(':', '');
        if (parseInt(endVal) <= parseInt(startVal)) {
            window.showToast("종료 시간은 시작 시간보다 늦어야 합니다.", "error");
            return;
        }

        // [추가] 00:00 가 12:00로 보이도록 보정 (사용자 가독성용)
        const formatTime = (t) => {
            let [h, m] = t.split(':').map(Number);
            if (h === 0) h = 12; // 00시는 12시로 표시
            else if (h > 12) h -= 12; // 13시 이상은 12를 뺌
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const displayStart = formatTime(start);
        const displayEnd = formatTime(end);

        detailMsg = `${ampm} 외출(${displayStart} ~${displayEnd})`;
    }

    // [수정] 기본 confirm 대신 커스텀 모달 사용
    showAttendanceConfirmModal(student, detailMsg, async () => {
        const teacherPrefix = getStoredEmailPrefix();

        const formData = new FormData();
        formData.append("num", student["학번"]);
        formData.append("bad", "근태");
        formData.append("detail", detailMsg);
        formData.append("teacher", teacherPrefix);
        formData.append("time", new Date().toISOString());

        try {
            await saveRecord(formData);
            window.showToast("정상적으로 기록되었습니다.", "success");
            const modal = document.getElementById("action-modal");
            if (modal) modal.remove();
            loadStudents();
        } catch (e) {
            window.showToast("기록 저장에 실패했습니다.", "error");
            console.error(e);
        }
    });
};

// [신규] 근태 기록 전용 세련된 커스텀 확인 모달
function showAttendanceConfirmModal(student, detailMsg, onConfirm) {
    const overlay = document.createElement("div");
    overlay.className = "attendance-confirm-overlay";

    const isEarly = detailMsg.includes("조퇴");
    const typeLabel = isEarly ? "조퇴" : "외출";
    const icon = isEarly ? "🏠" : "🏃";

    // 사진 처리 (utils.js의 함수가 전역에 있다고 가정하거나 직접 구현)
    const extractDriveId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:\/d\/|id=)([\w-]{25,})/);
        return match ? match[1] : null;
    };
    const getThumbnailUrl = (fileId) => {
        return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=s220` : "https://via.placeholder.com/120x150?text=No+Photo";
    };

    const photoUrl = student["사진저장링크"] || "";
    let bgUrl;
    if (photoUrl.startsWith('http') && !photoUrl.includes('drive.google.com')) {
        bgUrl = photoUrl;
    } else {
        bgUrl = getThumbnailUrl(extractDriveId(photoUrl));
    }

    overlay.innerHTML = `
        <div class="attendance-confirm-card" style="padding: 24px; text-align: center;">
            <div class="attendance-confirm-icon" style="font-size: 2.5rem; margin-bottom: 12px;">${icon}</div>
            <div class="attendance-confirm-title" style="font-weight: 800; font-size: 1.2rem; color: #1e293b; margin-bottom: 18px;">${typeLabel} 기록 확인</div>
            
            <div class="attendance-confirm-student-container" style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 20px;">
                <img src="${bgUrl}" style="width: 100px; height: 130px; border-radius: 12px; object-fit: cover; border: 2px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="color: #2563eb; font-weight: 900; font-size: 1.1rem;">${student["학번"]}</span>
                    <span style="font-weight: 700; font-size: 1.2rem; color: #1e293b;">${student["이름"]}</span>
                </div>
            </div>

            <div class="attendance-confirm-msg" style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; color: #475569; font-size: 0.95rem; line-height: 1.5; border: 1px dashed #cbd5e1;">
                해당 학생의 <strong>'${detailMsg}'</strong> 기록을<br>데이터베이스에 저장할까요?
            </div>
            
            <div class="attendance-btn-group" style="display: flex; gap: 10px;">
                <button class="attendance-btn cancel" style="flex:1; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 600; color: #64748b; cursor: pointer;">취소</button>
                <button class="attendance-btn confirm" style="flex:2; padding: 14px; border-radius: 12px; border: none; background: #3b82f6; color: white; font-weight: 800; cursor: pointer;">기록하기</button>
            </div>
        </div>
    `;

    overlay.querySelector(".cancel").onclick = () => overlay.remove();
    overlay.querySelector(".confirm").onclick = () => {
        overlay.remove();
        onConfirm();
    };

    document.body.appendChild(overlay);

    // 배경 클릭 시 닫기
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

window.openStatusModal = function (student) {
    const grid = document.getElementById("action-grid-main");
    if (!grid) return;

    // 타이틀 변경
    const titleEl = document.getElementById("action-modal-title");
    if (titleEl) {
        const displayNum = student["번호"] || (student["학번"] ? String(student["학번"]).slice(-2) : "??");
        titleEl.textContent = `[${displayNum}번] ${student["이름"]} 학적 상태 변경`;
    }

    // 현재 학적 상태 파싱 (숙려제 여부 확인)
    const currentStatus = student["학적"] || "재학";
    const isCoolingOff = currentStatus.startsWith("숙려제");

    let defaultStart = "";
    let defaultEnd = "";
    if (isCoolingOff) {
        const parts = currentStatus.split('|');
        defaultStart = parts[1] || "";
        defaultEnd = parts[2] || "";
    } else {
        const now = new Date();
        defaultStart = now.toISOString().split('T')[0];
        const end = new Date();
        end.setDate(now.getDate() + 13); // 기본 2주
        defaultEnd = end.toISOString().split('T')[0];
    }

    grid.innerHTML = `
        <div class="attendance-input-card" style="background: #f8fafc; padding: 25px 15px; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px; width: 100%;">
            <div class="attendance-input-group" style="margin-bottom: 20px;">
                <label style="display: block; font-size: 0.9rem; font-weight: 700; color: #64748b; margin-bottom: 15px; text-align: center;">변경할 학적/상태 선택</label>
                
                <div id="status-button-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    ${['재학', '전출', '전입', '자퇴', '위탁', '숙려제'].map(status => {
        const isActive = (status === '숙려제' && isCoolingOff) || (status === currentStatus);
        return `
                            <button class="status-opt-btn ${isActive ? 'active' : ''}" 
                                    onclick="selectStatusOption(this, '${status}')"
                                    style="padding: 12px; border-radius: 12px; border: 1.5px solid ${isActive ? '#6366f1' : '#e2e8f0'}; 
                                           background: ${isActive ? '#f5f3ff' : 'white'}; 
                                           color: ${isActive ? '#6366f1' : '#475569'}; 
                                           font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                                ${status}
                            </button>
                        `;
    }).join('')}
                </div>
                <input type="hidden" id="status-select-value" value="${isCoolingOff ? '숙려제' : currentStatus}">
            </div>

            <!-- 숙려제 전용 날짜 설정 섹션 -->
            <div id="cooling-off-section" style="display: ${isCoolingOff ? 'block' : 'none'}; border-top: 1px dashed #e2e8f0; pt: 20px; margin-top: 15px;">
                <div style="display: flex; gap: 15px; margin-top: 15px;">
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px;">숙려제 시작일</label>
                        <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                            <button class="time-quick-btn" onclick="adjustDate('cooling-start', 1)" style="flex:1; height: 36px; font-size: 0.8rem; border-radius: 8px;">+1일</button>
                            <button class="time-quick-btn" onclick="adjustDate('cooling-start', -1)" style="flex:1; height: 36px; font-size: 0.8rem; border-radius: 8px;">-1일</button>
                        </div>
                        <input type="date" id="cooling-start" value="${defaultStart}" style="width: 100%; padding: 10px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-family: inherit; font-weight: 700; text-align: center;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px;">숙려제 종료일</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px;">
                            <button class="time-quick-btn" onclick="adjustDate('cooling-end', 1)" style="height: 36px; font-size: 0.8rem; border-radius: 8px;">+1일</button>
                            <button class="time-quick-btn" onclick="adjustDate('cooling-end', -1)" style="height: 36px; font-size: 0.8rem; border-radius: 8px;">-1일</button>
                            <button class="time-quick-btn" onclick="adjustDate('cooling-end', 7)" style="height: 36px; font-size: 0.8rem; border-radius: 8px;">+1주</button>
                            <button class="time-quick-btn" onclick="adjustDate('cooling-end', -7)" style="height: 36px; font-size: 0.8rem; border-radius: 8px;">-1주</button>
                        </div>
                        <input type="date" id="cooling-end" value="${defaultEnd}" style="width: 100%; padding: 10px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-family: inherit; font-weight: 700; text-align: center;">
                    </div>
                </div>
            </div>
        </div>

        <button id="status-submit-btn" class="action-submit-btn" onclick="saveStatus(${JSON.stringify(student).replace(/"/g, '&quot;')})" style="background: #6366f1; margin-top: 10px; font-weight: 800; font-size: 1.4rem; border: none; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);">
            💾 학적상태 변경 저장
        </button>
    `;

    // 상태 선택 버튼 이벤트 헬퍼
    window.selectStatusOption = (btn, value) => {
        // 모든 버튼 비활성화
        document.querySelectorAll('.status-opt-btn').forEach(b => {
            b.classList.remove('active');
            b.style.borderColor = '#e2e8f0';
            b.style.background = 'white';
            b.style.color = '#475569';
        });
        // 선택한 버튼 활성화
        btn.classList.add('active');
        btn.style.borderColor = '#6366f1';
        btn.style.background = '#f5f3ff';
        btn.style.color = '#6366f1';

        // 숨겨진 input에 값 저장
        document.getElementById('status-select-value').value = value;

        // 숙려제 섹션 토글
        const section = document.getElementById('cooling-off-section');
        section.style.display = value === '숙려제' ? 'block' : 'none';

        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(8);
        }
    };
};

// [신규] 날짜 가산 함수
window.adjustDate = function (inputId, daysToAdd) {
    const input = document.getElementById(inputId);
    if (!input.value) return;

    const date = new Date(input.value);
    date.setDate(date.getDate() + daysToAdd);

    // YYYY-MM-DD 형식으로 변환
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    input.value = `${yyyy}-${mm}-${dd}`;
};

window.saveStatus = async function (student) {
    const statusType = document.getElementById('status-select-value').value;

    let finalStatus = statusType;
    if (statusType === '숙려제') {
        const start = document.getElementById('cooling-start').value;
        const end = document.getElementById('cooling-end').value;
        if (!start || !end) {
            window.showToast("숙려제 시작일과 종료일을 입력해주세요.", "error");
            return;
        }
        finalStatus = `숙려제|${start}|${end}`;
    }

    // [수정] 기본 confirm 대신 세련된 커스텀 모달 사용
    showStatusConfirmModal(student, statusType, async () => {
        try {
            const { error } = await supabase
                .from('students')
                .update({ status: finalStatus })
                .eq('student_id', student["학번"]);

            if (error) throw error;

            window.showToast("상태가 정상적으로 변경되었습니다.", "success");
            const modal = document.getElementById("action-modal");
            if (modal) modal.remove();
            loadStudents();
        } catch (e) {
            window.showToast("상태 변경에 실패했습니다.", "error");
            console.error(e);
        }
    });
};

// [신규] 학적 상태 변경 전용 세련된 커스텀 확인 모달
function showStatusConfirmModal(student, newStatus, onConfirm) {
    const overlay = document.createElement("div");
    overlay.className = "attendance-confirm-overlay";

    // 사진 처리
    const extractDriveId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:\/d\/|id=)([\w-]{25,})/);
        return match ? match[1] : null;
    };
    const getThumbnailUrl = (fileId) => {
        return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=s220` : "https://via.placeholder.com/120x150?text=No+Photo";
    };

    const photoUrl = student["사진저장링크"] || student.photo_url || "";
    let bgUrl;
    if (photoUrl.startsWith('http') && !photoUrl.includes('drive.google.com')) {
        bgUrl = photoUrl;
    } else {
        bgUrl = getThumbnailUrl(extractDriveId(photoUrl));
    }

    overlay.innerHTML = `
        <div class="attendance-confirm-card" style="padding: 24px; text-align: center; background: white; border-radius: 28px; width: 90%; max-width: 340px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
            <div class="attendance-confirm-icon" style="font-size: 2.5rem; margin-bottom: 12px; filter: drop-shadow(0 4px 10px rgba(99, 102, 241, 0.3));">🪪</div>
            <div class="attendance-confirm-title" style="font-weight: 800; font-size: 1.2rem; color: #1e293b; margin-bottom: 20px;">학적 상태 변경 확인</div>
            
            <div class="attendance-confirm-student-container" style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 24px;">
                <img src="${bgUrl}" style="width: 110px; height: 145px; border-radius: 16px; object-fit: cover; border: 2.5px solid #f1f5f9; box-shadow: 0 8px 20px rgba(0,0,0,0.12); transition: transform 0.3s;">
                <div style="display: flex; flex-direction: column; gap: 3px;">
                    <span style="color: #6366f1; font-weight: 900; font-size: 1.15rem; letter-spacing: 1px;">${student["학번"]}</span>
                    <span style="font-weight: 800; font-size: 1.3rem; color: #1e293b;">${student["이름"]}</span>
                </div>
            </div>

            <div class="attendance-confirm-msg" style="background: #f5f3ff; padding: 18px; border-radius: 16px; margin-bottom: 28px; color: #4338ca; font-size: 0.98rem; line-height: 1.6; border: 1px solid #ddd6fe; font-weight: 500;">
                현재 상태를 <strong>'${newStatus}'</strong>(으)로<br>변경하시겠습니까?
            </div>
            
            <div class="attendance-btn-group" style="display: flex; gap: 12px;">
                <button class="attendance-btn cancel" style="flex:1; padding: 16px; border-radius: 14px; border: 1.5px solid #e2e8f0; background: white; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s;">취소</button>
                <button class="attendance-btn confirm" style="flex:2; padding: 16px; border-radius: 14px; border: none; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 8px 16px rgba(99, 102, 241, 0.25);">변경하기</button>
            </div>
        </div>
    `;

    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 3000; animation: fadeIn 0.2s ease;";

    const cancelBtn = overlay.querySelector(".cancel");
    const confirmBtn = overlay.querySelector(".confirm");

    cancelBtn.onclick = () => {
        overlay.classList.add("fade-out");
        overlay.addEventListener("animationend", () => overlay.remove());
    };

    confirmBtn.onclick = () => {
        overlay.remove();
        onConfirm();
    };

    document.body.appendChild(overlay);

    overlay.onclick = (e) => {
        if (e.target === overlay) cancelBtn.click();
    };
}

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
// [신규] 세련된 디자인의 토스트 알림 함수
window.showToast = function (message, type = 'error') {
    // 컨테이너 없으면 생성
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    // 타입별 아이콘 설정
    let icon = '🔔';
    if (type === 'error') icon = '⚠️';
    if (type === 'success') icon = '✅';
    if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    // 3초 후 제거 애니메이션 및 삭제
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
            if (container.childNodes.length === 0) {
                container.remove();
            }
        });
    }, 3000);
};
