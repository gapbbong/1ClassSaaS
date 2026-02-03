import { fetchStudentRecords, saveRecord, deleteRecord as apiDeleteRecord } from './api.js';
import { formatDate } from './utils.js';
import { API_CONFIG } from './config.js';

const urlParams = new URLSearchParams(window.location.search);
const studentName = urlParams.get("name") || "";
const num = urlParams.get("num") || "";

document.addEventListener("DOMContentLoaded", () => {
    setupHeader();
    setupForm();
    loadSettings();
    loadRecords();
});

function setupHeader() {
    document.title = `${studentName} 학생 생활기록`;
    // 사용자 요청: "학생 생활기록" 제거
    document.getElementById("pageTitle").textContent = `${num}번 ${studentName}`;

    // 뒤로가기 버튼
    const backBtn = document.querySelector(".btn-back");
    if (backBtn) {
        backBtn.onclick = goBack;
    }
}

function setupForm() {
    // 현재 시간 설정
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
    const recordTimeInput = document.getElementById("recordTime");
    if (recordTimeInput) recordTimeInput.value = localISOTime;

    // 폼 및 버튼 설정
    const form = document.getElementById("recordForm");
    const btn = document.getElementById("submitBtn");

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            btn.disabled = true;
            btn.textContent = "저장 중...";

            const formData = new FormData();
            formData.append("num", num);
            formData.append("name", studentName);
            formData.append("time", recordTimeInput.value);

            // 셀렉트 박스에서 값 수집
            const goodVal = document.getElementById("good").value;
            const badVal = document.getElementById("bad").value;
            if (goodVal) formData.append("good", goodVal);
            if (badVal) formData.append("bad", badVal);
            // 텍스트상자
            formData.append("detail", document.getElementById("detail").value);
            formData.append("teacher", document.getElementById("teacherName").value);
            formData.append("action", "addRecord");

            try {
                const data = await saveRecord(formData);
                if (data.result === "success") {
                    alert("✅ 저장되었습니다.");
                    // 폼 초기화 (체크박스 해제 등)
                    form.reset();
                    // 시간 재설정
                    const now2 = new Date();
                    const localISO2 = new Date(now2 - offset).toISOString().slice(0, 16);
                    recordTimeInput.value = localISO2;

                    btn.disabled = false;
                    btn.textContent = "기록 저장";
                    loadRecords(); // 목록 갱신
                } else {
                    alert("저장 실패: " + data.message);
                    btn.disabled = false;
                    btn.textContent = "기록 저장";
                }
            } catch (error) {
                console.error("Save Error:", error);
                alert("통신 오류가 발생했습니다.");
                btn.disabled = false;
                btn.textContent = "기록 저장";
            }
        });
    }
}

async function loadRecords() {
    const logBox = document.getElementById("logContainer");
    if (!logBox) return;

    logBox.innerHTML = ""; // 기존 내용 초기화
    logBox.className = "loading-records"; // 애니메이션 클래스 추가

    try {
        const data = await fetchStudentRecords(num, studentName);

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
    try {
        const response = await fetch(`${API_CONFIG.SCRIPT_URL}?action=getSettings`);
        const settings = await response.json();

        const goodSelect = document.getElementById("good");
        const badSelect = document.getElementById("bad");

        // 초기화 (기존 하드코딩된 내용이 있을 수 있으므로)
        if (goodSelect) goodSelect.innerHTML = '<option value="">선택</option>';
        if (badSelect) badSelect.innerHTML = '<option value="">선택</option>';

        if (goodSelect && settings.good) {
            settings.good.forEach(item => {
                const opt = document.createElement("option");
                opt.value = item;
                opt.textContent = item;
                goodSelect.appendChild(opt);
            });
        }

        if (badSelect && settings.bad) {
            settings.bad.forEach(item => {
                const opt = document.createElement("option");
                opt.value = item;
                opt.textContent = item;
                badSelect.appendChild(opt);
            });
        }
    } catch (error) {
        console.error("Settings Load Error:", error);
    }
}
