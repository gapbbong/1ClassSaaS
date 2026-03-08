import { isLightColor } from './utils.js';
import { fetchClassStats, fetchClassInfo, getTeacherProfile, logPageView } from './api.js';
import { API_CONFIG } from './config.js';

// CryptoJS 임포트 (Vite 환경)
import CryptoJS from 'crypto-js';

let classInfo = [];

console.log("index.js loaded successfully");

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded triggered");

  // [v4.15] 스플래시 화면 최소 노출 시간 (1.2초)
  const splashPromise = new Promise(resolve => setTimeout(resolve, 1200));

  try {
    // 인증 체크
    console.log("Starting authentication check...");
    const isAuthenticated = await initAuth();
    console.log("Authentication result:", isAuthenticated);
    if (!isAuthenticated) return;

    // [Step 2] 활동 로그 기록
    const email = getFullStoredEmail();
    if (email) {
      logPageView(email, "메인 홈 (index.html)");
    }

    const container = document.getElementById("class-list");
    if (!container) {
      console.error("class-list container not found");
      return;
    }
    container.innerHTML = "";
    container.classList.add("loading-records");

    const recordCountVal = document.getElementById("record-count-val");
    if (recordCountVal) {
      recordCountVal.innerText = "";
      recordCountVal.classList.add("loading-dots");
    }

    console.log("Starting data fetch...");
    // 1. 교사 정보(DB) 및 통계 데이터 병렬 조회
    const [infoData, stats] = await Promise.all([
      fetchClassInfo().catch(e => {
        console.error("fetchClassInfo failed:", e);
        return [];
      }),
      fetchClassStats().catch(e => {
        console.error("fetchClassStats failed:", e);
        return { grandTotal: 0, classStats: {} };
      })
    ]);

    console.log("Data fetch finished. infoData:", infoData, "stats:", stats);
    classInfo = infoData;

    // 2. DB 정보를 바탕으로 기본 레이아웃을 그립니다.
    console.log("Rendering initial grid...");
    renderInitialGrid(container);
    console.log("Grid rendering finished.");

    // 3. 상단 총 건수 업데이트
    if (recordCountVal && stats) {
      const grandTotal = stats.grandTotal !== undefined ? stats.grandTotal : 0;
      recordCountVal.classList.remove("loading-dots");
      recordCountVal.innerText = grandTotal;
    }

    // 4. 각 반 박스의 배지 업데이트
    if (stats && stats.classStats) {
      console.log("Updating badges...");
      updateClassBadges(stats.classStats);
    }

    container.classList.remove("loading-records");
    console.log("Startup process finished successfully.");

    // [v4.15] 데이터 로딩 완료 후 스플래시 화면 제거
    await splashPromise;
    const splash = document.getElementById("splash-screen");
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 600); // 트랜지션 완료 후 제거
    }

  } catch (error) {
    console.error("CRITICAL ERROR during index load:", error);
    window.alert("화면을 불러오는 중 오류가 발생했습니다: " + error.message);
    const container = document.getElementById("class-list");
    if (container) {
      container.innerHTML = `<div style="padding:20px; color:red;">❌ 오류 발생: ${error.message}<br>콘솔 로그를 확인해주세요.</div>`;
      container.classList.remove("loading-records");
    }
  }

  // 5. 모달 서비스 및 기타 UI 초기화
  initContactModal();
  initGlobalTip();
  initHeaderMenu();
  updateDynamicCalendar();
  window.addEventListener('resize', updateDynamicCalendar);
});

/**
 * 캘린더 아이콘에 오늘 날짜와 요일을 표시하고,
 * 화면 크기에 따라 PC(월별), 모바일(주별) 링크를 다르게 설정합니다.
 */
function updateDynamicCalendar() {
  const dayEl = document.querySelector(".cal-day");
  const dateEl = document.querySelector(".cal-date");
  const calendarLink = document.getElementById("calendar-link");

  if (!dayEl || !dateEl) return;

  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayColors = [
    '#ea4335', // 일: 빨강
    '#f57c00', // 월: 주황
    '#388e3c', // 화: 초록
    '#1976d2', // 수: 파랑
    '#7b1fa2', // 목: 보라
    '#00796b', // 금: 청록
    '#303f9f'  // 토: 남색
  ];

  const dayIndex = now.getDay();
  const dayName = days[dayIndex];
  const dayColor = dayColors[dayIndex];
  const dateNum = now.getDate();

  dayEl.innerText = dayName;
  dayEl.style.backgroundColor = dayColor;
  dateEl.innerText = dateNum;
  dateEl.style.color = dayColor;

  if (calendarLink) {
    calendarLink.href = "calendar.html";
    // 타겟 제거 (현재창 이동)
    calendarLink.removeAttribute("target");

    // [v3.4.1] 캘린더 힌트 소멸 로직
    const isHintHidden = localStorage.getItem('calendar_hint_hidden') === 'true';
    if (isHintHidden) {
      calendarLink.classList.add('hide-hint');
    }

    // 클릭 시 힌트 영구 숨김
    calendarLink.addEventListener('click', () => {
      localStorage.setItem('calendar_hint_hidden', 'true');
      calendarLink.classList.add('hide-hint');
    }, { once: true });
  }
}


// ----------------------------------------------------
// 헤더 메뉴 및 로그아웃 로직
// ----------------------------------------------------
function initHeaderMenu() {
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const hamburgerDropdown = document.getElementById("hamburger-dropdown");
  const logoutBtn = document.getElementById("logout-btn");

  if (hamburgerBtn && hamburgerDropdown) {
    // 햄버거 아이콘 클릭 (토글)
    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // 바디 클릭 방지
      hamburgerDropdown.style.display = hamburgerDropdown.style.display === "block" ? "none" : "block";
    });

    // 화면 다른 곳 클릭하면 닫히게 설정
    document.addEventListener("click", () => {
      hamburgerDropdown.style.display = "none";
    });
  }

  // [추가] '우리반 분석' 메뉴 권한 제어
  checkClassAnalysisPermission();

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("정말로 로그아웃 하시겠습니까?")) {
        localStorage.removeItem("teacher_auth_token");
        // 전체 새로고침
        location.reload();
      }
    });
  }
}

/**
 * 암호화된 이메일 불러오기 (마스킹됨)
 */
function getStoredEmail() {
  const encrypted = localStorage.getItem('teacher_auth_token');
  if (!encrypted) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, API_CONFIG.SECRET_KEY);
    const email = bytes.toString(CryptoJS.enc.Utf8);
    return email ? maskEmailPrefix(email.split('@')[0]) : "교사";
  } catch (e) {
    return "교사";
  }
}

/**
 * 암호화된 전체 이메일 불러오기
 */
function getFullStoredEmail() {
  const encrypted = localStorage.getItem('teacher_auth_token');
  if (!encrypted) return "";
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, API_CONFIG.SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return "";
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

/**
 * 암호화하여 저장
 */
function setStoredEmail(email) {
  const encrypted = CryptoJS.AES.encrypt(email, API_CONFIG.SECRET_KEY).toString();
  localStorage.setItem('teacher_auth_token', encrypted);
}

// ----------------------------------------------------
// 교사 인증 로직 (Local Storage + Crypto JS)
// ----------------------------------------------------
async function initAuth() {
  const authModal = document.getElementById('auth-modal');
  const authInput = document.getElementById('auth-email-input');
  const authSubmit = document.getElementById('auth-submit-btn');
  const errorMsg = document.getElementById('auth-error-msg');
  const titleBar = document.querySelector('.title-bar');
  const classGrid = document.querySelector('.class-grid');

  const storedEmail = getStoredEmail();
  const fullEmail = getFullStoredEmail();

  // 이미 인증되어있다면 모달 숨기고 진행
  if (storedEmail) {
    if (fullEmail && window.clarity) {
      window.clarity("identify", fullEmail);
    }

    if (storedEmail === 'keeper@kse.hs.kr' || fullEmail === 'keeper@kse.hs.kr') {
      window.location.href = 'keeper.html';
      return false;
    }
    authModal.style.display = 'none';
    return true;
  }

  // 인증 안 되어 있으면 모달 메인에 강제 노출 (배경 콘텐츠 숨기기)
  titleBar.style.display = 'none';
  classGrid.style.display = 'none';

  authModal.style.display = 'flex';
  authModal.style.backgroundColor = 'rgba(255,255,255,1)'; // 불투명하게 덮기

  return new Promise((resolve) => {
    authSubmit.addEventListener('click', async () => {
      const email = authInput.value.trim();
      if (!email) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = '이메일을 입력해주세요.';
        return;
      }

      authSubmit.textContent = '확인 중...';
      errorMsg.style.display = 'none';

      try {
        // supabase 모듈은 api.js에서 이미 쓰고 있으므로 빌려서 쓸 수 있도록 맨 위에 추가합니다.
        // 여기서는 api.js 쪽에 함수를 만들어 부르는 것이 더 좋습니다.
        const { supabase } = await import('./supabase.js');

        const { data, error } = await supabase
          .from('teachers')
          .select('email')
          .eq('email', email)
          .maybeSingle();

        if (error || !data) {
          errorMsg.style.display = 'block';
          errorMsg.textContent = '등록되지 않은 교사 이메일입니다.';
          authSubmit.textContent = '인증하기';
        } else {
          // 인증 통과
          setStoredEmail(data.email);

          if (window.clarity) {
            window.clarity("identify", data.email);
          }

          if (data.email === 'keeper@kse.hs.kr') {
            window.location.href = 'keeper.html';
            resolve(false);
            return;
          }
          authModal.style.display = 'none';
          // 화면 복구
          titleBar.style.display = 'flex';
          classGrid.style.display = 'flex';
          resolve(true);
        }
      } catch (err) {
        console.error('Auth error', err);
        errorMsg.style.display = 'block';
        errorMsg.textContent = '네트워크 오류가 발생했습니다.';
        authSubmit.textContent = '인증하기';
      }
    });

    // 엔터키 지원
    authInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        authSubmit.click();
      }
    });
  });
}


function initGlobalTip() {
  const tipEl = document.getElementById("global-tip");
  const hideCheckbox = document.getElementById("hide-global-tip");
  const closeBtn = document.getElementById("close-global-tip");

  if (!tipEl || !hideCheckbox) return;

  if (localStorage.getItem("hideGlobalTip") !== "true") {
    tipEl.style.display = "flex";
  }

  // 체크박스 누르면 바로 사라지게 처리
  hideCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      localStorage.setItem("hideGlobalTip", "true");
      tipEl.style.display = "none";
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      tipEl.style.display = "none";
    });
  }
}

function renderInitialGrid(container) {
  container.innerHTML = "";

  for (let grade = 1; grade <= 3; grade++) {
    const col = document.createElement("div");
    col.className = "grade-column";

    for (let classNum = 1; classNum <= 6; classNum++) {
      const box = document.createElement("div");
      box.className = "class-box";

      const info = classInfo.find(c => c.grade === grade && c.class === classNum);
      if (info) {
        // 배경색 결정
        let hue = grade === 1 ? 150 : (grade === 2 ? 210 : 30);
        let light = 90 - (classNum * 12);
        const bgColor = `hsl(${hue}, 60%, ${light}%)`;

        box.innerHTML = `
                    <section class="class-section" 
                             style="background-color: ${bgColor}; ${light < 55 ? 'color: #fff;' : ''}; cursor: pointer; -webkit-tap-highlight-color: transparent;">
                        <h3 class="class-title" style="${light < 55 ? 'color: #fff;' : 'color: #333; -webkit-text-stroke: 0.5px #fff; paint-order: stroke fill;'}; pointer-events: none; text-shadow: ${light < 55 ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 3px rgba(0,0,0,0.2)'};">
                            <span class="class-label">${grade}-${classNum}반</span>
                            <span id="badge-${grade}-${classNum}" class="badge-placeholder"></span>
                        </h3>
                        <div class="teacher-line" style="pointer-events: none; ${light < 55 ? 'color: #fff; -webkit-text-stroke: 0.3px #000; text-shadow: 0 1px 2px rgba(0,0,0,0.8);' : 'color: #000; -webkit-text-stroke: 0; text-shadow: none;'}">
                            <div>        
                                <strong>${info.homeroom}</strong>
                            </div>
                            <div>
                                <strong>${info.sub}</strong>
                            </div>
                        </div>
                    </section>
                `;

        // 클릭 이벤트 직접 등록 (전역 스코프 이슈 방지)
        const section = box.querySelector(".class-section");
        if (section) {
          section.addEventListener("click", (e) => window.handleClassClick(e, grade, classNum));
        }
      }
      col.appendChild(box);
    }
    container.appendChild(col);
  }

  // 그려진 박스들에 롱프레스(Long Press) 이벤트 달기
  attachLongPressEvents();
}

function updateClassBadges(classStats) {
  Object.keys(classStats).forEach(key => {
    const badgeEl = document.getElementById(`badge-${key}`);
    const count = classStats[key];
    if (badgeEl && count > 0) {
      const [grade, classNum] = key.split("-");
      // TODO: 설정 기능 추가 시 토글 가능하도록 복구할 예정
      // badgeEl.innerHTML = `<a href="total-records.html?grade=${grade}&class=${classNum}" class="count-badge-link"><span class="count-badge">(${count}건)</span></a>`;
      badgeEl.innerHTML = ``; // 현재는 무조건 숨김
    }
  });
}

// ----------------------------------------------------
// 연락처 롱프레스 및 모달 로직
// ----------------------------------------------------

let pressTimer;
let isPressing = false;
let startX = 0, startY = 0;
let lastLongPressTime = 0;

window.handleClassClick = function (e, g, c) {
  // 모달이 열려있거나 롱프레스 직후라면 이동 방지
  const modal = document.getElementById("contact-modal");
  const isModalOpen = modal && (modal.style.display === "flex" || modal.style.display === "block");
  const now = Date.now();
  const justLongPressed = (now - lastLongPressTime < 500);

  console.log("Class Click:", g, c, "ModalOpen:", isModalOpen, "JustPressed:", justLongPressed);

  if (isModalOpen || justLongPressed) {
    if (e) e.preventDefault();
    return;
  }

  // stu-list.html이 기대하는 파라미터로 명시적 이동
  const targetUrl = `stu-list.html?grade=${g}&class=${c}`;
  console.log("Redirecting to:", targetUrl);
  window.location.href = targetUrl;
};

function attachLongPressEvents() {
  const boxes = document.querySelectorAll(".class-box");

  boxes.forEach((box) => {
    const classTitle = box.querySelector(".class-label");
    if (!classTitle) return;
    const text = classTitle.innerText; // "1-1반"

    // 매치되는 선생님 정보 찾기
    const match = text.match(/(\d)-(\d)반/);
    if (!match) return;
    const grade = parseInt(match[1], 10);
    const classNum = parseInt(match[2], 10);
    const info = classInfo.find(c => c.grade === grade && c.class === classNum);

    if (!info) return;

    // 터치/마우스 다운 (박스 전체)
    const startPress = (e) => {
      // 롱프레스 시 내부의 a 태그의 기본 이동을 막거나 제어하기 위한 플래그
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;

      isPressing = true;
      box.classList.add("pressing");

      pressTimer = setTimeout(() => {
        if (isPressing) {
          e.preventDefault(); // 기본 동작 막기
          if (navigator.vibrate) navigator.vibrate(50); // 햅틱 피드백
          lastLongPressTime = Date.now();
          openContactModal(info);
        }
      }, 400); // 0.4초 길게 누르면 발동 (전작 600ms에서 단축)
    };

    // 터치/마우스 업 및 취소
    const endPress = (e) => {
      clearTimeout(pressTimer);
      isPressing = false;
      box.classList.remove("pressing");
    };

    // 스크롤 시 취소
    const cancelPress = (e) => {
      if (!isPressing) return;

      const touch = e.touches ? e.touches[0] : e;
      const moveX = Math.abs(touch.clientX - startX);
      const moveY = Math.abs(touch.clientY - startY);

      // 조금만 움직여도 취소 (스크롤용)
      if (moveX > 10 || moveY > 10) {
        clearTimeout(pressTimer);
        isPressing = false;
        box.classList.remove("pressing");
      }
    };

    // 박스 전체에 이벤트 리스너 등록
    box.addEventListener("mousedown", startPress);
    box.addEventListener("touchstart", startPress, { passive: false }); // preventDefault 사용을 위해 passive: false

    box.addEventListener("mouseup", endPress);
    box.addEventListener("mouseleave", endPress);
    box.addEventListener("touchend", endPress);
    box.addEventListener("touchcancel", endPress);

    box.addEventListener("mousemove", cancelPress);
    box.addEventListener("touchmove", cancelPress, { passive: true });

    // 브라우저 기본 메뉴(복사, 공유 등) 방지
    box.addEventListener("contextmenu", (e) => {
      if (isPressing || (modal && modal.style.display === "flex")) {
        e.preventDefault();
      }
    });


  });
}

function openContactModal(info) {
  const modal = document.getElementById("contact-modal");
  const title = document.getElementById("contact-modal-title");
  const body = document.getElementById("contact-modal-body");

  if (!modal) return;

  title.innerText = `${info.grade}학년 ${info.class}반 교사 연락처`;

  // 담임/부담임 전화/문자 버튼 생성
  let bodyHtml = '';

  // 1. 담임 정보
  if (info.homeroom && info.homeroom !== '미정') {
    bodyHtml += `
      <div class="teacher-contact-row">
          <span>👤 담임: ${info.homeroom}</span>
          <div class="teacher-contact-actions">
              ${info.homeroomPhone ? `
                <a href="tel:${info.homeroomPhone}" style="color:#FF3B30">📞</a>
                <a href="sms:${info.homeroomPhone}" style="color:#34C759">💬</a>
              ` : '<span style="font-size:0.8rem; color:#999;">연락처 없음</span>'}
          </div>
      </div>`;
  }

  // 2. 부담임 정보
  if (info.sub && info.sub !== '미정') {
    bodyHtml += `
      <div class="teacher-contact-row">
          <span>👤 부담임: ${info.sub}</span>
          <div class="teacher-contact-actions">
              ${info.subPhone ? `
                <a href="tel:${info.subPhone}" style="color:#FF3B30">📞</a>
                <a href="sms:${info.subPhone}" style="color:#34C759">💬</a>
              ` : '<span style="font-size:0.8rem; color:#999;">연락처 없음</span>'}
          </div>
      </div>`;
  }

  if (!bodyHtml) bodyHtml = '<div style="padding:10px; color:#999;">등록된 교사 정보가 없습니다.</div>';
  body.innerHTML = bodyHtml;

  modal.style.display = "flex";
}

function initContactModal() {
  const modal = document.getElementById("contact-modal");
  if (!modal) return;

  const closeBtn = document.getElementById("close-contact-modal");

  // 닫기 버튼으로 닫기
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  // 배경 클릭 시 닫기
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  // ESC 키로 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modal.style.display === "flex") {
        modal.style.display = "none";
      }

      const tipEl = document.getElementById("global-tip");
      if (tipEl && tipEl.style.display !== "none") {
        tipEl.style.display = "none";
      }
    }
  });
}

/**
 * '우리반 분석' 메뉴의 노출 여부를 결정합니다.
 */
async function checkClassAnalysisPermission() {
  const encrypted = localStorage.getItem('teacher_auth_token');
  if (!encrypted) return;

  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, API_CONFIG.SECRET_KEY);
    const email = bytes.toString(CryptoJS.enc.Utf8);

    const teacher = await getTeacherProfile(email);
    const menuBtn = document.getElementById("menu-class-analysis");
    const keeperBtn = document.getElementById("menu-keeper");

    // [추가] 소유자(관리자) 전용 메뉴 노출
    if (keeperBtn && (email === 'gapbbong@naver.com' || email === 'assari@kse.hs.kr')) {
      keeperBtn.style.display = "block";
    }

    if (menuBtn && teacher && (teacher.role === 'homeroom_teacher' || teacher.role === 'admin' || email === 'assari@kse.hs.kr' || email === 'gapbbong@naver.com')) {
      menuBtn.style.display = "block";

      // 링크 설정: assigned_class가 있으면 해당 반으로, 없는데 관리자면 1-1로
      let g = "1", c = "1";
      if (teacher.assigned_class) {
        [g, c] = teacher.assigned_class.split('-');
      } else if (teacher.role === 'admin' || email === 'assari@kse.hs.kr') {
        // 관리자인데 담임반이 없는 경우 기본 1-1
        g = "1"; c = "1";
      }

      menuBtn.onclick = (e) => {
        e.preventDefault();
        location.href = `class-analysis.html?grade=${g}&class=${c}`;
      };
    }
  } catch (e) {
    console.warn("Permission check failed", e);
  }
}
