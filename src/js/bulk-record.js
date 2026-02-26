import { fetchAllStudents, bulkSaveRecords } from './api.js';
import { API_CONFIG } from './config.js';
import { extractDriveId, getThumbnailUrl } from './utils.js';

let allStudents = [];
let selectedStudents = [];

document.addEventListener("DOMContentLoaded", async () => {
    // 1. 초기 데이터 로드 (학생 명단 & 설정)
    await initData();

    // 2. 검색 입력 이벤트 설정 (버튼 클릭 및 엔터키)
    const studentInput = document.getElementById("student-input");
    const searchBtn = document.getElementById("search-btn");

    searchBtn.addEventListener("click", () => handleSearch(studentInput.value));
    studentInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleSearch(studentInput.value);
        }
    });

    // 3. 저장 버튼 이벤트 설정
    const saveBtn = document.getElementById("save-all-btn");
    saveBtn.addEventListener("click", handleSaveAll);

    // 4. 설정 항목 로드 (칭찬/벌점)
    loadSettings();

    // 5. 사진 크기 조절 초기화
    initSizeControl();

    // [추가] 폰/브라우저 뒤로가기 버튼과 연결 (데이터 유실 방지)
    window.addEventListener("beforeunload", (e) => {
        if (selectedStudents.length > 0) {
            e.preventDefault();
            e.returnValue = ""; // 브라우저 표준 확인창 출력
        }
    });
});

function initSizeControl() {
    const btns = document.querySelectorAll(".btn-size");
    const grid = document.getElementById("selected-students");

    // 로컬 스토리지에서 저장된 크기 불러오기 (기본값 보통: 200)
    const savedSize = localStorage.getItem("bulk-photo-size") || "200";
    applyPhotoSize(savedSize);

    btns.forEach(btn => {
        btn.addEventListener("click", () => {
            const size = btn.getAttribute("data-size");
            applyPhotoSize(size);
            localStorage.setItem("bulk-photo-size", size);
        });
    });

    function applyPhotoSize(size) {
        // 활성화 버튼 표시
        btns.forEach(btn => {
            if (btn.getAttribute("data-size") === String(size)) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // CSS 변수 수정을 통해 그리드 크기 및 폰트 크기 동적 조절
        grid.style.setProperty('--card-width', `${size}px`);

        // 크기에 비례하여 폰트 크기 계산 (기준 150px -> 1.2em)
        const fontSize = (size / 150) * 1.2;
        grid.style.setProperty('--font-size', `${fontSize.toFixed(2)}em`);
    }
}

async function initData() {
    try {
        allStudents = await fetchAllStudents();
        console.log("Loaded students:", allStudents.length);
    } catch (error) {
        console.error("Failed to load students:", error);
        alert("학생 데이터를 불러오지 못했습니다.");
    }
}

async function handleSearch(value) {
    const query = value.trim();

    if (!query) return;

    const student = allStudents.find(s => String(s["학번"]) === query);

    if (student) {
        // [수정] 학적 상태 확인 및 알림 (커스텀 팝업)
        const status = student["학적"];
        if (status && status !== "재학") {
            const confirmed = await showModal(
                `⚠️ ${student["이름"]} 학생은 [${status}] 상태입니다.\n생활기록을 계속 추가할까요?`
            );

            if (!confirmed) {
                document.getElementById("student-input").value = "";
                document.getElementById("student-input").focus();
                return;
            }
        }

        addStudent(student);
        document.getElementById("student-input").value = ""; // 입력창 초기화
        document.getElementById("student-input").focus(); // 다시 포커스
    } else {
        alert("학생을 찾을 수 없습니다: " + query);
    }
}

/**
 * 커스텀 모달 팝업 표시
 * @param {string} message - 표시할 메시지
 * @returns {Promise<boolean>} 확인/취소 결과
 */
function showModal(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById("custom-modal");
        const msgEl = document.getElementById("modal-msg");
        const confirmBtn = document.getElementById("modal-confirm");
        const cancelBtn = document.getElementById("modal-cancel");

        msgEl.innerText = message;
        modal.style.display = "flex";

        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            modal.style.display = "none";
            confirmBtn.removeEventListener("click", handleConfirm);
            cancelBtn.removeEventListener("click", handleCancel);
        };

        confirmBtn.addEventListener("click", handleConfirm);
        cancelBtn.addEventListener("click", handleCancel);
    });
}

function addStudent(student) {
    // 중복 추가 방지
    if (selectedStudents.some(s => s["학번"] === student["학번"])) {
        return;
    }

    selectedStudents.push(student);
    appendStudentCard(student); // 전체를 다시 그리지 않고 하나만 추가
    updateSaveButton();
}

function removeStudent(num) {
    selectedStudents = selectedStudents.filter(s => s["학번"] !== num);

    // DOM에서 직접 제거
    const grid = document.getElementById("selected-students");
    const cards = grid.querySelectorAll(".student-card");
    cards.forEach(card => {
        if (card.getAttribute("data-num") === String(num)) {
            card.remove();
        }
    });

    if (selectedStudents.length === 0) {
        grid.innerHTML = `<div class="empty-msg">선택된 학생이 없습니다.</div>`;
    }

    updateSaveButton();
}

function renderSelectedStudents() {
    const grid = document.getElementById("selected-students");
    grid.innerHTML = "";

    if (selectedStudents.length === 0) {
        grid.innerHTML = `<div class="empty-msg">선택된 학생이 없습니다.</div>`;
        return;
    }

    selectedStudents.forEach(student => appendStudentCard(student));
}

function appendStudentCard(student) {
    const grid = document.getElementById("selected-students");

    // "선택된 학생이 없습니다" 메시지 제거
    const emptyMsg = grid.querySelector(".empty-msg");
    if (emptyMsg) emptyMsg.remove();

    const card = document.createElement("div");
    card.className = "student-card";
    if (student["학적"] && student["학적"] !== "재학") {
        card.classList.add("not-active");
    }
    card.setAttribute("data-num", student["학번"]);

    // 이미지 설정 (Supabase photo_url 우선, 구글 드라이브 하위 호환)
    const supabasePhotoUrl = student.photo_url || student["사진저장링크"];
    const driveLink = student["사진저장링크"] || "";
    const fileId = extractDriveId(driveLink || supabasePhotoUrl);

    let imgSrc = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    if (supabasePhotoUrl && supabasePhotoUrl.startsWith('http')) {
        imgSrc = supabasePhotoUrl;
    } else if (fileId) {
        imgSrc = getThumbnailUrl(fileId);
    }

    const img = document.createElement("img");
    img.src = imgSrc;
    img.loading = "lazy";

    // 이미지 로드 실패 시 재시도 로직 보강 (Google Drive 폴백)
    img.onerror = function () {
        if (this.getAttribute("data-retry")) {
            this.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
            return;
        }
        this.setAttribute("data-retry", "true");
        if (fileId) {
            this.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w500`;
        }
    };

    const info = document.createElement("div");
    info.className = "info";
    info.textContent = `${student["학번"]} ${student["이름"]}`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeStudent(student["학번"]);
    };

    // [추가] 학적 표시 (재학이 아닌 경우에만)
    if (student["학적"] && student["학적"] !== "재학") {
        const statusBadge = document.createElement("span");
        statusBadge.className = "status-badge";

        if (student["학적"] === "graduated") {
            statusBadge.classList.add("graduated");
            statusBadge.textContent = "졸업";
        } else {
            statusBadge.textContent = student["학적"];
        }
        card.appendChild(statusBadge);
    }

    card.appendChild(img);
    card.appendChild(info);
    card.appendChild(removeBtn);
    grid.appendChild(card);
}

// 글로벌 핸들러로 등록 (팝업에서 쓰는 student.js와 겹치지 않게 주의)
window.removeBulkStudent = removeStudent;

function updateSaveButton() {
    const btn = document.getElementById("save-all-btn");
    btn.textContent = `일괄 저장하기 (${selectedStudents.length}명)`;
    btn.disabled = selectedStudents.length === 0;
}

// Settings 시트에서 항목 가져오기 (기존 로직 활용)
async function loadSettings() {
    try {
        // [수정] API_CONFIG.SCRIPT_URL을 사용하여 설정 정보를 가져옴
        const url = `${API_CONFIG.SCRIPT_URL}?action=getSettings`;
        const res = await fetch(url);
        const data = await res.json();

        // 데이터 구조가 { result: 'ok', good: [...], bad: [...] } 라고 가정
        const settings = data;

        const goodSelect = document.getElementById("good-select");
        const badSelect = document.getElementById("bad-select");

        // 초기화
        goodSelect.innerHTML = '<option value="">선택</option>';
        badSelect.innerHTML = '<option value="">선택</option>';

        if (settings.good && Array.isArray(settings.good)) {
            settings.good.forEach(item => {
                const opt = document.createElement("option");
                opt.value = item;
                opt.textContent = item;
                goodSelect.appendChild(opt);
            });
        }
        if (settings.bad && Array.isArray(settings.bad)) {
            settings.bad.forEach(item => {
                const opt = document.createElement("option");
                opt.value = item;
                opt.textContent = item;
                badSelect.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Settings load error:", e);
        // 실패 시 기본 항목이라도 표시
        const badItems = ["지각", "복장불량", "신발불량", "가방없음", "두발불량"];
        const badSelect = document.getElementById("bad-select");
        badItems.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item;
            opt.textContent = item;
            badSelect.appendChild(opt);
        });
    }
}

/**
 * 로그인된 교사의 이메일 아이디를 추출합니다.
 */
function getTeacherId() {
    const encrypted = localStorage.getItem('teacher_auth_token');
    if (!encrypted) return "미인증";
    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, API_CONFIG.SECRET_KEY);
        const email = bytes.toString(CryptoJS.enc.Utf8);
        return email ? email.split('@')[0] : "알수없음";
    } catch (e) {
        console.error("Teacher ID extraction error:", e);
        return "오류";
    }
}

async function handleSaveAll() {
    const good = document.getElementById("good-select").value;
    const bad = document.getElementById("bad-select").value;
    const detail = document.getElementById("detail-input").value;
    const teacher = getTeacherId(); // 자동으로 아이디 추출

    if (!good && !bad && !detail) {
        alert("기록할 내용을 입력해주세요.");
        return;
    }

    if (!confirm(`${selectedStudents.length}명의 학생에게 이 기록을 일괄 저장할까요?`)) {
        return;
    }

    const btn = document.getElementById("save-all-btn");
    btn.disabled = true;
    btn.textContent = "저장 중...";

    // 전송 데이터 구성
    const recordData = {
        good,
        bad,
        detail,
        teacher
    };

    // 선택된 학생 리스트
    const targets = selectedStudents.map(s => ({ num: s["학번"], name: s["이름"] }));

    try {
        const result = await bulkSaveRecords(targets, recordData);

        if (result.result === "success") {
            alert(`✅ ${result.count}명의 기록이 저장되었습니다.`);
            location.href = "index.html"; // 메인으로 이동
        } else {
            alert("저장 실패");
        }
    } catch (error) {
        console.error("Bulk save error:", error);
        alert("통신 오류가 발생했습니다.");
    } finally {
        btn.disabled = false;
        updateSaveButton();
    }
}
