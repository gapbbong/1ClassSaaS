import { API_CONFIG } from './config.js';
import CryptoJS from 'crypto-js';

const CONFIG = {
    // 캘린더 전용 구글 앱스 스크립트 웹 앱 URL
    API_URL: "https://script.google.com/macros/s/AKfycbwrvR1UoJH1Se_gDxJ1HNLkhT0a1Nh6kmJ2vbLRN2bW914XIEvv1lw17kGiIMi8mVhKsg/exec"
};

let viewMode = 'month'; // 'month' or 'all'
let currentYear = 2026;
let currentMonth = 3; // 기본 3월 시작

// 실제 현재 날짜가 2026년 3월 이후라면 해당 월로 설정
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

    if (btnNext) {
        btnNext.addEventListener('click', async () => {
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
            await loadMonthData(currentYear, currentMonth, true); // append mode
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
    showLoading(true, `${year}년 ${month}월 일정을 불러오고 있습니다...`);
    try {
        const response = await fetch(`${CONFIG.API_URL}?month=${month}`);
        const data = await response.json();

        if (append) {
            loadedEvents.push(...data);
        } else {
            loadedEvents = data;
        }

        renderCalendar(loadedEvents, year, month, append);
        updateTitle();
    } catch (e) {
        console.error("Fetch Error:", e);
        alert("일정 로드 중 오류가 발생했습니다.");
    } finally {
        showLoading(false);
    }
}

async function loadAllData() {
    showLoading(true, "전체 일정을 불러오는 중입니다...", "전체 학년도 일정을 통합 중입니다. 데이터 전송량이 많으므로 잠시만 더 기다려 주세요.");
    try {
        const response = await fetch(`${CONFIG.API_URL}?all=true`);
        const data = await response.json();
        loadedEvents = data;

        viewMode = 'all';
        renderCalendarAll(loadedEvents);

        const titleEl = document.getElementById('current-month-view');
        if (titleEl) titleEl.innerText = "2026학년도 전체 일정";

        const btnNext = document.getElementById('btn-next-month');
        if (btnNext) btnNext.style.display = 'none';
    } catch (e) {
        console.error("Fetch All Error:", e);
        alert("전체 일정 로드 중 오류가 발생했습니다.");
    } finally {
        showLoading(false);
    }
}

function updateTitle() {
    const titleEl = document.getElementById('current-month-view');
    if (titleEl) {
        if (viewMode === 'all') {
            titleEl.innerText = "2026학년도 전체 일정";
        } else {
            titleEl.innerText = `${currentYear}년 ${currentMonth}월 일정`;
        }
    }
}

/**
 * 특정 월의 1일부터 말일까지 보두 렌더링
 */
function renderCalendar(events, year, month, append = false) {
    const listContainer = document.getElementById("day-list");
    if (!listContainer) return;

    if (!append) listContainer.innerHTML = "";

    // 날짜별 그룹화
    const grouped = {};
    events.forEach(ev => {
        if (!grouped[ev.date]) grouped[ev.date] = [];
        grouped[ev.date].push(ev);
    });

    const lastDay = new Date(year, month, 0).getDate();

    let lastMonth = -1;

    for (let d = 1; d <= lastDay; d++) {
        const dateObj = new Date(year, month - 1, d);
        const m = dateObj.getMonth() + 1;

        // 월이 바뀌면 구분자 추가
        if (m !== lastMonth) {
            const separator = document.createElement("div");
            separator.className = "month-separator";
            separator.innerText = `${m}월`;
            listContainer.appendChild(separator);
            lastMonth = m;
        }

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        // API에서 오는 포맷이 M-D 일 수 있으므로 보정 (분해해서 비교)
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

        const eventsHtml = dayEvents.map(ev => `
            <div class="event-item">
                <span class="event-title">${ev.title}</span>
                <span class="event-tag">[${ev.typeName}] ${ev.dept ? `<span class="event-dept">(${ev.dept})</span>` : ''}</span>
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
 * 전체 모드 렌더링 (이벤트가 있는 날짜만 또는 전체? 전체면 너무 많으므로 이벤트 있는 날 위주로)
 * 사용자 요청: "전체 버튼 누르면 모든 버튼 나오는데" -> 일단 이벤트 있는 날짜 위주 정렬
 */
function renderCalendarAll(events) {
    const listContainer = document.getElementById("day-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

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

        // 월이 바뀌면 구분자 추가
        if (m !== lastMonth) {
            const separator = document.createElement("div");
            separator.className = "month-separator";
            separator.innerText = `${m}월`;
            listContainer.appendChild(separator);
            lastMonth = m;
        }

        const dayIdx = dateObj.getDay();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayClasses = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        const card = document.createElement("div");
        card.className = `day-card ${dayClasses[dayIdx]}`;

        const eventsHtml = grouped[dateStr].map(ev => `
            <div class="event-item">
                <span class="event-title">${ev.title}</span>
                <span class="event-tag">[${ev.typeName}] ${ev.dept ? `<span class="event-dept">(${ev.dept})</span>` : ''}</span>
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
        listContainer.appendChild(card);
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
        authModal.style.backgroundColor = '#f3f4f6';
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
            errorMsg.style.display = 'none';

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
                console.error('Auth error', err);
                errorMsg.style.display = 'block';
                errorMsg.textContent = '네트워크 오류가 발생했습니다.';
                authSubmit.textContent = '인증하기';
                authSubmit.disabled = false;
            }
        });

        authInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') authSubmit.click();
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

function showLoading(show, text = "일정을 불러오고 있습니다...", subText = "") {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
        overlay.style.display = show ? "flex" : "none";
        const p = overlay.querySelector('p');
        if (p) p.innerText = text;

        let subEl = overlay.querySelector('.loading-text-detail');
        if (!subEl && subText) {
            subEl = document.createElement('div');
            subEl.className = 'loading-text-detail';
            overlay.appendChild(subEl);
        }
        if (subEl) subEl.innerText = subText;
    }
}
