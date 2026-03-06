import { API_CONFIG } from './config.js';
import CryptoJS from 'crypto-js';

const CONFIG = {
    // 캘린더 전용 구글 앱스 스크립트 웹 앱 URL
    API_URL: "https://script.google.com/macros/s/AKfycbwrvR1UoJH1Se_gDxJ1HNLkhT0a1Nh6kmJ2vbLRN2bW914XIEvv1lw17kGiIMi8mVhKsg/exec"
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
            if (viewMode === 'academic_only') {
                viewMode = 'month';
                btnAcademic.innerText = '📅 연간 학사';
                btnAcademic.classList.remove('active'); // CSS에서 필요시 사용
                renderCalendar(loadedEvents, currentYear, currentMonth);
            } else {
                viewMode = 'academic_only';
                btnAcademic.innerText = '📋 전체 보기';
                renderCalendarAcademic(loadedEvents);
            }
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
        const response = await fetch(`${CONFIG.API_URL}?month=${month}`);
        const data = await response.json();

        if (append) {
            loadedEvents.push(...data);
        } else {
            loadedEvents = data;
        }

        if (viewMode === 'academic_only') {
            renderCalendarAcademic(loadedEvents);
        } else {
            renderCalendar(loadedEvents, year, month, append);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
        alert("일정 로드 중 오류가 발생했습니다.");
    } finally {
        showLoading(false);
    }
}

async function loadAllData() {
    showLoading(true, "전체 일정을 불러오는 중입니다...", "데이터량이 많아 잠시만 더 기다려 주세요.");
    try {
        const response = await fetch(`${CONFIG.API_URL}?all=true`);
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
                <span class="event-title">${dayEvents.length > 1 ? `<span class="event-seq">${idx + 1}.</span> ` : ''}${ev.title} <span class="event-tag">[${ev.typeName}]${ev.dept ? ` <span class="event-dept">(${ev.dept})</span>` : ''}</span></span>
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
                <span class="event-title">${dayEvents.length > 1 ? `<span class="event-seq">${idx + 1}.</span> ` : ''}${ev.title} <span class="event-tag">[${ev.typeName}]${ev.dept ? ` <span class="event-dept">(${ev.dept})</span>` : ''}</span></span>
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
