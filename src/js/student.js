import { API_CONFIG } from './config.js';
import { extractDriveId, getThumbnailUrl } from './utils.js';
import { fetchStudentsByClass, fetchClassInfo } from './api.js';

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
    // HTML에 onclick="goToRelativeClass(-1)" 등이 있으므로 이를 JS로 연결
    const prevBtn = document.querySelector(".floating-controls button:first-child");
    const homeBtn = document.querySelector(".floating-controls button:nth-child(2)");
    const nextBtn = document.querySelector(".floating-controls button:last-child");

    if (prevBtn) prevBtn.addEventListener("click", () => goToRelativeClass(-1));
    if (homeBtn) homeBtn.addEventListener("click", goHome);
    if (nextBtn) nextBtn.addEventListener("click", () => goToRelativeClass(1));

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
                        showRecord(student);
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
function showPopup(student) {
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    if (!popup || !overlay) return;

    popup.innerHTML = ""; // 초기화
    overlay.style.display = "block";

    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "X";
    closeBtn.style.float = "right";
    closeBtn.style.border = "none";
    closeBtn.style.background = "none";
    closeBtn.style.fontSize = "18px";
    closeBtn.style.fontWeight = "bold";
    closeBtn.style.cursor = "pointer";
    closeBtn.onclick = closePopup;
    popup.appendChild(closeBtn);

    // 이미지 (Supabase photo_url 우선)
    const supabasePhotoUrl = student.photo_url;
    const driveFileId = extractDriveId(student["사진저장링크"] || student.photo_url);

    if (supabasePhotoUrl || driveFileId) {
        const img = document.createElement("img");
        if (supabasePhotoUrl && supabasePhotoUrl.startsWith('http')) {
            img.src = supabasePhotoUrl;
        } else {
            img.src = getThumbnailUrl(driveFileId);
        }

        img.onerror = function () {
            if (driveFileId) this.src = `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1000`;
        };
        popup.appendChild(img);
    }

    // 이름 및 기록 버튼
    const h3 = document.createElement("h3");
    h3.textContent = `${student["학번"]} ${student["이름"]} `;

    // 팝업 내부 기록 버튼
    const recordIcon = document.createElement("span");
    recordIcon.textContent = "📒";
    recordIcon.style.cursor = "pointer";
    recordIcon.onclick = (e) => {
        e.stopPropagation();
        showRecord(student);
    };
    h3.appendChild(recordIcon);
    popup.appendChild(h3);

    // 상세 정보
    const exclude = ["PID", "연번", "학년", "반", "파일명", "학번", "이름", "학생별시트", "사진저장링크", "주보호자성명", "보조보호자성명", "주보호자연락처", "보조보호자연락처", "주보호자관계", "보조보호자관계", "주보호자친밀도", "보조보호자친밀도", "우편번호", "집주소", "상세주소", "입력시간"];
    village:
    for (let key in student) {
        if (!exclude.includes(key) && student[key]) {
            const info = document.createElement("div");
            info.className = "info";
            const isPhone = key.includes("전화") || key.includes("연락처") || key.includes("번호") || key.includes("폰");

            info.innerHTML = `<strong>${key}:</strong> ${student[key]}`;
            if (isPhone) {
                // 전화 걸기/문자 링크 추가
                const phoneLink = document.createElement("a");
                phoneLink.href = `tel:${student[key]}`;
                phoneLink.textContent = "📞";

                const smsLink = document.createElement("a");
                smsLink.href = `sms:${student[key]}`;
                smsLink.textContent = "📩";

                info.appendChild(document.createTextNode(" ")); // 공백
                info.appendChild(phoneLink);
                info.appendChild(smsLink);
            }
            popup.appendChild(info);
        }
    }

    // 하단 닫기 버튼
    const closeBtn2 = document.createElement("button");
    closeBtn2.textContent = "닫기";
    closeBtn2.style.marginTop = "10px";
    closeBtn2.style.padding = "5px 10px";
    closeBtn2.style.cursor = "pointer";
    closeBtn2.onclick = closePopup;
    popup.appendChild(closeBtn2);

    popup.style.display = "block";
}

function closePopup() {
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    if (popup) popup.style.display = "none";
    if (overlay) overlay.style.display = "none";
}

// 페이지 이동 함수
function showRecord(student) {
    const name = encodeURIComponent(student["이름"]);
    const num = encodeURIComponent(student["학번"]);
    window.location.href = `record.html?num=${num}&name=${name}`;
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
