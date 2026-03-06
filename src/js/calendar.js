import { API_CONFIG } from './config.js';
import CryptoJS from 'crypto-js';

const CONFIG = {
    // 캘린더 전용 구글 앱스 스크립트 웹 앱 URL
    API_URL: "https://script.google.com/macros/s/AKfycbwxLJwfP5HqBCvg-44HUlYbok3HdjJjZY1ZJzA6Zz-8NVglsd5cJB4utQJK-z8P7SH18Q/exec"
};

let viewMode = 'month'; // 'month', 'all', 'academic_only'
let currentYear = 2026;
let currentMonth = 3;

const today = new Date();
if (today.getFullYear() === 2026 && today.getMonth() + 1 >= 3) {
    currentMonth = today.getMonth() + 1;
} else if (today.getFullYear() > 2026) {
    currentYear = today.getFullYear();
    currentMonth = today.getMonth() + 1;
}

let loadedEvents = [];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const isAuthenticated = await initAuth();
        if (!isAuthenticated) return;

        await initCalendar();
    } catch (error) {
        console.error("Initialization error:", error);
    }
});

async function initCalendar() {
    setupButtons();
    await loadMonthData(currentYear, currentMonth);
}

function setupButtons() {
    const btnNext = document.getElementById('btn-next-month');
    const btnFull = document.getElementById('btn-full-year');
    const btnBack = document.getElementById('btn-back-home');
    const btnAcademic = document.getElementById('btn-filter-academic');

    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    if (btnAcademic) {
        btnAcademic.addEventListener('click', () => {
            showAcademicPopup();
        });
    }

    const btnClosePopup = document.getElementById('close-academic-btn');
    if (btnClosePopup) {
        btnClosePopup.addEventListener('click', closeAcademicPopup);
    }

    // 오버레이 클릭 시 닫기
    const overlay = document.getElementById('academic-popup-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAcademicPopup();
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', async () => {
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
            await loadMonthData(currentYear, currentMonth, true);
        });
    }

    if (btnFull) {
        btnFull.addEventListener('click', async () => {
            const confirmed = confirm("2026학년도 전체 일정을 가져오시겠습니까?\n\n모든 데이터를 한꺼번에 불러오므로 시간과 데이터가 약간 소모될 수 있습니다. 잠시만 기다려 주세요.");
            if (confirmed) {
                viewMode = 'all';
                await loadAllData();
            }
        });
    }
}

async function loadMonthData(year, month, append = false) {
    showLoading(true, `${month}월 일정을 불러오고 있습니다...`);
    try {
        const response = await fetch(`${CONFIG.API_URL}?month=${month}&t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (append) {
            loadedEvents.push(...data);
        } else {
            loadedEvents = data;
        }

        if (viewMode === 'academic_only') {
            renderCalendarAcademic(loadedEvents);
        } else {
            renderCalendar(eventsToRender(loadedEvents, year, month), year, month, append);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
        // 사용자에게 보이지만 일정은 나올 수도 있으므로 로그만 남기거나 에러 타입 체크
    } finally {
        showLoading(false);
    }
}

function eventsToRender(allEvents, year, month) {
    return allEvents.filter(ev => {
        const parts = ev.date.split('-').map(Number);
        return parts[0] === year && parts[1] === month;
    });
}

async function loadAllData() {
    showLoading(true, "전체 일정을 불러오는 중입니다...", "데이터량이 많아 잠시만 더 기다려 주세요.");
    try {
        const response = await fetch(`${CONFIG.API_URL}?all=true&t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        loadedEvents = data;

        if (viewMode === 'academic_only') {
            renderCalendarAcademic(loadedEvents);
        } else {
            renderCalendarAll(loadedEvents);
        }

        const btnNext = document.getElementById('btn-next-month');
        if (btnNext) btnNext.style.display = 'none';
        const btnFull = document.getElementById('btn-full-year');
        if (btnFull) btnFull.style.display = 'none';
    } catch (e) {
        console.error("Fetch All Error:", e);
    } finally {
        showLoading(false);
    }
}

/**
 * 일반 리스트 뷰 (1일~말일)
 */
function renderCalendar(events, year, month, append = false) {
    const listContainer = document.getElementById("day-list");
    if (!listContainer) return;
    if (!append) listContainer.innerHTML = "";

    const lastDay = new Date(year, month, 0).getDate();
    let lastMonth = -1;

    for (let d = 1; d <= lastDay; d++) {
        const dateObj = new Date(year, month - 1, d);
        const m = dateObj.getMonth() + 1;

        if (m !== lastMonth) {
            const separator = document.createElement("div");
            separator.className = "month-separator";
            separator.innerText = `${m}월`;
            listContainer.appendChild(separator);
            lastMonth = m;
        }

        const dayEvents = events.filter(ev => {
            const parts = ev.date.split('-').map(Number);
            return parts[0] === year && parts[1] === month && parts[2] === d;
        });

        const dayIdx = dateObj.getDay();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayClasses = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const isToday = dateObj.toDateString() === new Date().toDateString();

        const card = document.createElement("div");
        card.className = `day-card ${isToday ? 'today' : ''} ${dayClasses[dayIdx]}`;

        const eventsHtml = dayEvents.map((ev, idx) => `
            <div class="event-item">
                <span class="event-seq">${idx + 1}.</span>
                <span class="event-title">${ev.title} <span class="event-tag">[${ev.typeName}]${ev.dept ? ` <span class="event-dept">(${ev.dept})</span>` : ''}</span></span>
            </div>
        `).join('') || '<div class="no-event">일정이 없습니다.</div>';

        card.innerHTML = `
            <div class="day-info">
                <span class="day-name">${m}월 ${d}일 (${days[dayIdx]})</span>
            </div>
            <div class="event-content">
                ${eventsHtml}
            </div>
        `;
        listContainer.appendChild(card);
    }
}

/**
 * 연간 학사일정만 모아보기 필터 뷰
 */
function renderCalendarAcademic(events) {
    const listContainer = document.getElementById("day-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    const academicOnly = events.filter(ev => ev.typeName === '연간' || ev.type === 'academic');

    if (academicOnly.length === 0) {
        listContainer.innerHTML = '<div class="no-event" style="padding:40px; text-align:center;">등록된 연간 학사일정이 없습니다.</div>';
        return;
    }

    renderGroupedEvents(listContainer, academicOnly);
}

/**
 * 연도 전체 데이터 렌더링
 */
function renderCalendarAll(events) {
    const listContainer = document.getElementById("day-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";
    renderGroupedEvents(listContainer, events);
}

function renderGroupedEvents(container, events) {
    const grouped = {};
    events.forEach(ev => {
        if (!grouped[ev.date]) grouped[ev.date] = [];
        grouped[ev.date].push(ev);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => {
        const da = a.split('-').map(Number);
        const db = b.split('-').map(Number);
        return new Date(da[0], da[1] - 1, da[2]) - new Date(db[0], db[1] - 1, db[2]);
    });

    let lastMonth = -1;
    sortedDates.forEach(dateStr => {
        const parts = dateStr.split('-').map(Number);
        const y = parts[0], m = parts[1], d = parts[2];
        const dateObj = new Date(y, m - 1, d);

        if (m !== lastMonth) {
            const separator = document.createElement("div");
            separator.className = "month-separator";
            separator.innerText = `${m}월`;
            container.appendChild(separator);
            lastMonth = m;
        }

        const dayIdx = dateObj.getDay();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayClasses = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        const card = document.createElement("div");
        card.className = `day-card ${dayClasses[dayIdx]}`;

        const dayEvents = grouped[dateStr];
        const eventsHtml = dayEvents.map((ev, idx) => `
            <div class="event-item">
                <span class="event-seq">${idx + 1}.</span>
                <span class="event-title">${ev.title} <span class="event-tag">[${ev.typeName}]${ev.dept ? ` <span class="event-dept">(${ev.dept})</span>` : ''}</span></span>
            </div>
        `).join('');

        card.innerHTML = `
            <div class="day-info">
                <span class="day-name">${m}월 ${d}일 (${days[dayIdx]})</span>
            </div>
            <div class="event-content">
                ${eventsHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * 교사 인증 로직
 */
async function initAuth() {
    const authModal = document.getElementById('auth-modal');
    const authInput = document.getElementById('auth-email-input');
    const authSubmit = document.getElementById('auth-submit-btn');
    const errorMsg = document.getElementById('auth-error-msg');
    const container = document.querySelector('.calendar-container');

    const storedEmail = getStoredEmail();
    if (storedEmail) {
        if (authModal) authModal.style.display = 'none';
        return true;
    }

    if (container) container.style.display = 'none';
    if (authModal) {
        authModal.style.display = 'flex';
    }

    return new Promise((resolve) => {
        authSubmit.addEventListener('click', async () => {
            const email = authInput.value.trim();
            if (!email) {
                errorMsg.style.display = 'block';
                errorMsg.textContent = '이메일을 입력해주세요.';
                return;
            }

            authSubmit.textContent = '확인 중...';
            authSubmit.disabled = true;

            try {
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
                    authSubmit.disabled = false;
                } else {
                    setStoredEmail(data.email);
                    authModal.style.display = 'none';
                    if (container) container.style.display = 'block';
                    resolve(true);
                }
            } catch (err) {
                errorMsg.style.display = 'block';
                errorMsg.textContent = '인증 중 오류가 발생했습니다.';
                authSubmit.textContent = '인증하기';
                authSubmit.disabled = false;
            }
        });
    });
}

function getStoredEmail() {
    const encrypted = localStorage.getItem('teacher_auth_token');
    if (!encrypted) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, API_CONFIG.SECRET_KEY);
        const email = bytes.toString(CryptoJS.enc.Utf8);
        return email || null;
    } catch (e) { return null; }
}

function setStoredEmail(email) {
    const encrypted = CryptoJS.AES.encrypt(email, API_CONFIG.SECRET_KEY).toString();
    localStorage.setItem('teacher_auth_token', encrypted);
}

function showLoading(show, text = "불러오는 중...", subText = "") {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
        overlay.style.display = show ? "flex" : "none";
        const p = overlay.querySelector('p');
        if (p) p.innerText = text;
        let subEl = overlay.querySelector('.loading-text-detail');
        if (subEl) subEl.innerText = subText;
    }
}

/**
 * 연간 학사일정 팝업 표시
 */
async function showAcademicPopup() {
    const overlay = document.getElementById('academic-popup-overlay');
    const grid = document.getElementById('academic-grid');

    // 팝업 표시 및 스크롤 방지
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // 이미 렌더링되어 있다면 재사용
    if (grid.children.length > 0) return;

    grid.innerHTML = '<div style="text-align:center; padding: 50px; color:#666; width:100%;">연간 일정을 불러오는 중...</div>';

    try {
        // GAS API로부터 연간 정밀 데이터(yearly) 요청
        const response = await fetch(`${CONFIG.API_URL}?type=yearly&t=${Date.now()}`);
        if (!response.ok) throw new Error("데이터를 가져오지 못했습니다.");
        const yearlyData = await response.json();

        renderAcademicGrid(yearlyData);
    } catch (error) {
        grid.innerHTML = `<div style="color:red; text-align:center; padding:50px;">데이터 로드 실패: ${error.message}</div>`;
    }
}

function closeAcademicPopup() {
    const overlay = document.getElementById('academic-popup-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * 전교생 연간 일정을 월별 달력 격자로 렌더링
 */
function renderAcademicGrid(data) {
    const grid = document.getElementById('academic-grid');
    grid.innerHTML = '';

    // 2026년 3월부터 2027년 2월까지
    const months = [
        [2026, 3], [2026, 4], [2026, 5], [2026, 6], [2026, 7], [2026, 8],
        [2026, 9], [2026, 10], [2026, 11], [2026, 12], [2027, 1], [2027, 2]
    ];

    months.forEach(([year, month]) => {
        const monthBox = document.createElement('div');
        monthBox.className = 'academic-month-box';
        monthBox.innerHTML = `
            <div class="academic-month-title">${month}월</div>
            <div class="academic-day-grid">
                <div class="academic-day-header">일</div>
                <div class="academic-day-header">월</div>
                <div class="academic-day-header">화</div>
                <div class="academic-day-header">수</div>
                <div class="academic-day-header">목</div>
                <div class="academic-day-header">금</div>
                <div class="academic-day-header">토</div>
                ${generateMonthHTML(year, month, data)}
            </div>
        `;
        grid.appendChild(monthBox);
    });
}

function generateMonthHTML(year, month, events) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    let html = '';

    // 이전 달 공백 채우기
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="academic-day-cell other-month"></div>';
    }

    // 날짜 채우기
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const eventText = events[dateStr] || "";
        const isSaturday = (firstDay + d - 1) % 7 === 6;
        const isSunday = (firstDay + d - 1) % 7 === 0;

        let classes = 'academic-day-cell';
        if (isSaturday) classes += ' saturday';
        if (isSunday) classes += ' holiday';
        if (eventText) classes += ' has-event';

        html += `
            <div class="${classes}">
                <div class="academic-day-num">${d}</div>
                ${eventText ? `<div class="academic-day-event" title="${eventText.replace(/\n/g, ', ')}">${eventText.replace(/\n/g, '<br/>')}</div>` : ''}
            </div>
        `;
    }

    return html;
}
