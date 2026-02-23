import { fetchStudentRecords, saveRecord, deleteRecord as apiDeleteRecord, uploadEvidencePhoto } from './api.js';
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
    const form = document.getElementById("recordForm");
    const btn = document.getElementById("submitBtn");

    // 현재 시간 설정
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
    const recordTimeInput = document.getElementById("recordTime");
    if (recordTimeInput) recordTimeInput.value = localISOTime;

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

                // 셀렉트 박스에서 값 수집
                const goodVal = document.getElementById("good").value;
                const badVal = document.getElementById("bad").value;
                if (goodVal) formData.append("good", goodVal);
                if (badVal) formData.append("bad", badVal);

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
