import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, 'src', 'js', 'student.js');

let content = fs.readFileSync(filePath, 'utf8');

// Find the start/end of the popup functions
const startMarker = "// 팝업 관련 함수";
const endMarker = "// 페이지 이동 및 모달 액션";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const newPopupCode = \`// 팝업 관련 함수
function showPopup(student) {
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    if (!popup || !overlay) return;

    overlay.style.display = "block";
    popup.style.display = "block";
    popup.className = "student-detail-popup";

    // 이미지 소스 결정
    const supabasePhotoUrl = student.photo_url;
    const driveFileId = extractDriveId(student["사진저장링크"] || student.photo_url);
    
    let imgSrc = "";
    if (supabasePhotoUrl && supabasePhotoUrl.startsWith('http')) {
        imgSrc = supabasePhotoUrl;
    } else if (driveFileId) {
        imgSrc = getThumbnailUrl(driveFileId);
    }

    const fallbackImgSrc = driveFileId ? \\\`https://drive.google.com/thumbnail?id=\\\${driveFileId}&sz=w1000\\\` : '';

    // 보여주지 않을 키 목록
    const exclude = [
        "PID", "연번", "학년", "반", "파일명", "학생별시트", "사진저장링크", 
        "주보호자성명", "보조보호자성명", "주보호자연락처", "보조보호자연락처", 
        "주보호자관계", "보조보호자관계", "주보호자친밀도", "보조보호자친밀도", 
        "우편번호", "집주소", "상세주소", "입력시간",
        "pid", "student_id", "photo_url", "photo_path", "created_at", "updated_at", "class_info", "academic_year"
    ];

    let infoHtml = "";
    for (let key in student) {
        if (!exclude.includes(key) && student[key] !== null && student[key] !== "" && key !== "이름" && key !== "학번") {
            const val = student[key];
            const isPhone = key.includes("전화") || key.includes("연락처") || key.includes("번호") || key.includes("폰");
            const isInsta = key.toLowerCase().includes("인스타");

            infoHtml += \\\`<div class="detail-info-row">\\\`;
            infoHtml += \\\`<span class="detail-label">\\\${key}</span>\\\`;
            
            if (isPhone) {
                infoHtml += \\\`<span class="detail-value">\\\${val} 
                    <a href="tel:\\\${val}" class="contact-icon" title="전화걸기">📞</a>
                    <a href="sms:\\\${val}" class="contact-icon" title="문자보내기">💬</a>
                </span>\\\`;
            } else if (isInsta) {
                // 인스타그램 아이디 텍스트 정제 (보통 @ 떼고 아이디만)
                const instaId = String(val).replace('@', '').trim();
                infoHtml += \\\`<span class="detail-value">\\\${val} 
                    <a href="instagram://user?username=\\\${instaId}" class="contact-icon insta-link" title="인스타 앱 열기">📸</a>
                </span>\\\`;
            } else {
                infoHtml += \\\`<span class="detail-value">\\\${val}</span>\\\`;
            }
            infoHtml += \\\`</div>\\\`;
        }
    }

    const escapedStudent = JSON.stringify(student).replace(/"/g, '&quot;');

    popup.innerHTML = \\\`
        <div class="popup-header">
            <h3><span class="popup-num">\\\${student["학번"]}</span> \\\${student["이름"]}</h3>
            <div class="popup-header-actions">
                <button class="popup-record-btn" onclick='showRecord(\\\${escapedStudent})'>📒 기록하기</button>
            </div>
        </div>
        <div class="popup-grid">
            <div class="popup-photo-section">
                \\\${imgSrc ? \\\\\\\`<img src="\\\${imgSrc}" onerror="this.src='\\\${fallbackImgSrc}'" alt="\\\${student["이름"]} 사진">\\\\\\\` : \\\\\\\`<div class="no-photo-placeholder">📷<br>사진 없음</div>\\\\\\\`}
            </div>
            <div class="popup-info-section">
                <div class="popup-info-scroll">
                    \\\${infoHtml || '<div class="no-data-msg">추가 정보가 없습니다.</div>'}
                </div>
            </div>
        </div>
        <div class="popup-footer">
            <button class="popup-confirm-btn" onclick="closePopup()">확인 (닫기)</button>
        </div>
    \\\`;

    // 팝업 열릴 때 전역 키보드 이벤트 리스너 등록
    window._popupKeyHandler = function(e) {
        if (popup.style.display === "block") {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
                e.preventDefault(); // 스크롤 등 기본 동작 방지
                closePopup();
            }
        }
    };
    document.addEventListener("keydown", window._popupKeyHandler);
}

function closePopup() {
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    if (popup) {
        popup.style.display = "none";
        popup.className = ""; // Reset class to not affect older popups if any
    }
    if (overlay) overlay.style.display = "none";
    
    // 키보드 이벤트 리스너 해제
    if (window._popupKeyHandler) {
        document.removeEventListener("keydown", window._popupKeyHandler);
        window._popupKeyHandler = null;
    }
}

\`;

    const newContent = content.substring(0, startIndex) + newPopupCode + content.substring(endIndex);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("student.js successfully updated with new showPopup logic.");
} else {
    console.error("Could not find markers in student.js");
}
