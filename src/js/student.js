import { API_CONFIG } from './config.js';
import { extractDriveId, getThumbnailUrl } from './utils.js';
import { classInfo } from './teacher-data.js';

// URL 파라미터 파싱
const urlParams = new URLSearchParams(window.location.search);
const grade = parseInt(urlParams.get("grade"));
const classNum = parseInt(urlParams.get("class"));

document.addEventListener("DOMContentLoaded", () => {
    // 1. 타이틀 및 교사 정보 설정
    setupHeader();

    // 2. 학생 데이터 불러오기
    loadStudents();

    // 3. 이벤트 리스너 설정 (플로팅 버튼 등)
    setupEventListeners();

    // 4. 서비스 워커 등록
    registerServiceWorker();
});

function setupHeader() {
    const titleElement = document.getElementById("class-title");
    if (grade && classNum) {
        titleElement.textContent = `${grade}학년 ${classNum}반`;
        document.title = `${grade}학년 ${classNum}반 학생 목록`;
    } else {
        titleElement.textContent = "반 정보 없음";
    }

    const teacherInfoElement = document.getElementById("teacher-info");
    const info = classInfo.find(c => c.grade === grade && c.class === classNum);
    if (info) {
        // 교사 정보 렌더링
        // 교사 정보 렌더링 (담임 + 부담임)
        // 교사 정보 렌더링 (담임 + 부담임 수평 배치)
        teacherInfoElement.innerHTML = `
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px;">
                <!-- 담임 -->
                <div style="display: flex; align-items: center; gap: 4px;">
                    <span style="font-weight: bold;">${info.homeroom}</span>
                    <a href="tel:${info.homeroomPhone}" style="text-decoration: none; font-size: 0.9em;">📞</a>
                    <a href="sms:${info.homeroomPhone}" style="text-decoration: none; font-size: 0.9em;">💬</a>
                </div>
                ${info.sub ? `
                <!-- 부담임 -->
                <div style="display: flex; align-items: center; gap: 4px; color: #555;">
                    <span style="color: #ccc; margin: 0 2px;">|</span>
                    <span style="font-size: 0.95em;">${info.sub}</span>
                    <a href="tel:${info.subPhone}" style="text-decoration: none; font-size: 0.9em;">📞</a>
                    <a href="sms:${info.subPhone}" style="text-decoration: none; font-size: 0.9em;">💬</a>
                </div>` : ''}
            </div>
        `;
    }
}

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

import { fetchStudentsByClass } from './api.js';

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

                // 이미지
                const fileId = extractDriveId(student["사진저장링크"]);
                const img = document.createElement("img");
                img.src = getThumbnailUrl(fileId);
                img.loading = "lazy";

                // [수정] 이미지 로드 실패 시 대체 경로 시도 (Fallback)
                img.onerror = function () {
                    if (this.getAttribute("data-retry")) {
                        // 2차 시도(드라이브 직접 접근)도 실패 시 투명 이미지
                        this.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                        return;
                    }

                    this.setAttribute("data-retry", "true");

                    if (fileId) {
                        // 1차(lh3) 실패 시 -> 2차: drive.google.com 썸네일 API 시도
                        this.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w500`;
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

                // 이름 및 생활기록 아이콘
                const nameDiv = document.createElement("div");
                nameDiv.className = "student-name";

                const numberStr = String(student["학번"]).slice(-2);

                // 텍스트 노드 생성
                nameDiv.appendChild(document.createTextNode(`${numberStr} ${student["이름"]} `));

                // 생활기록 아이콘 생성 및 이벤트 리스너
                const recordIcon = document.createElement("span");
                recordIcon.textContent = "📒";
                recordIcon.style.cursor = "pointer";

                recordIcon.addEventListener("click", (e) => {
                    e.stopPropagation(); // 팝업 열기 방지
                    showRecord(student);
                });
                nameDiv.appendChild(recordIcon);

                container.appendChild(imgContainer);
                container.appendChild(nameDiv);

                // 학생 클릭 시 팝업
                container.addEventListener("click", () => showPopup(student));

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

    // 큰 이미지
    const fileId = extractDriveId(student["사진저장링크"]);
    if (fileId) {
        const img = document.createElement("img");
        img.src = getThumbnailUrl(fileId); // 팝업은 고해상도 필요? 썸네일 일단 사용
        // 원본 이미지가 필요하다면 구글 드라이브 URL 패턴 변경 필요
        // img.src = `https://drive.google.com/uc?export=view&id=${fileId}`; // 원본 (느릴 수 있음)
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
    const exclude = ["PID", "연번", "학년", "반", "파일명", "학번", "이름", "부성명", "모성명", "학생별시트", "사진저장링크", "부(연락처)", "모(연락처)"];
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
