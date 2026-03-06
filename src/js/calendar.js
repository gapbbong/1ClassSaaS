import { API_CONFIG } from './config.js';
import CryptoJS from 'crypto-js';

const CONFIG = {
    // 캘린더 전용 구글 앱스 스크립트 웹 앱 URL
    API_URL: "https://script.google.com/macros/s/AKfycby1NY-yj8dLt357ydtR7j-5GoIXoAZndPoVLATlm_JXrRWelLNDBQN6tAR0w6Nxb3Jo1g/exec"
};

let viewMode = 'month'; // 'month' or 'all'
let currentMonth = new Date().getMonth() + 1; // 1-indexed
if (new Date().getFullYear() > 2026 || (new Date().getFullYear() === 2026 && currentMonth < 3)) {
    // 2026학년도 시작인 3월로 기본 설정 (이미 지난 경우 제외 등 로직 가능하나 단순화)
}
// 현재 날짜가 2026년 3월 이전일 경우 3월로 초기화
if (new Date().getFullYear() < 2026 || (new Date().getFullYear() === 2026 && new Date().getMonth() < 2)) {
    currentMonth = 3;
} else if (new Date().getFullYear() === 2026) {
    currentMonth = new Date().getMonth() + 1;
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
    await loadMonthData(currentMonth);
}

function setupButtons() {
    const btnNext = document.getElementById('btn-next-month');
    const btnFull = document.getElementById('btn-full-year');

    if (btnNext) {
        btnNext.addEventListener('click', async () => {
            currentMonth++;
            if (currentMonth > 12) currentMonth = 1; // 연도 전환 로직은 학년도 기준이므로 복잡하나 일단 월만 증가
            await loadMonthData(currentMonth, true); // append mode
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

async function loadMonthData(month, append = false) {
    showLoading(true, "일정을 불러오고 있습니다...");
    try {
        const response = await fetch(`${CONFIG.API_URL}?month=${month}`);
        const data = await response.json();

        if (append) {
            loadedEvents.push(...data);
        } else {
            loadedEvents = data;
        }

        renderCalendar(loadedEvents);
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
        renderCalendar(loadedEvents);

        const titleEl = document.getElementById('current-month-view');
        if (titleEl) titleEl.innerText = "2026학년도 전체 일정";

        const btnNext = document.getElementById('btn-next-month');
        if (btnNext) btnNext.style.display = 'none'; // 전체 모드에서는 다음달 버튼 숨김
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
        titleEl.innerText = `2026년 ${currentMonth}월 일정`;
    }
}

function renderCalendar(events) {
    const listContainer = document.getElementById("day-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    if (!events || events.length === 0) {
        listContainer.innerHTML = '<div class="no-event" style="padding:40px; text-align:center;">표시할 일정이 없습니다.</div>';
        return;
    }

    // 날짜별로 그룹화
    const grouped = {};
    events.forEach(ev => {
        if (!grouped[ev.date]) grouped[ev.date] = [];
        grouped[ev.date].push(ev);
    });

    // 정렬된 날짜 배열
    const sortedDates = Object.keys(grouped).sort();

    sortedDates.forEach(dateStr => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayIdx = dateObj.getDay();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayClasses = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        const isToday = dateObj.toDateString() === new Date().toDateString();

        const card = document.createElement("div");
        card.className = `day-card ${isToday ? 'today' : ''} ${dayClasses[dayIdx]}`;

        const eventsHtml = grouped[dateStr].map(ev => `
            <div class="event-item">
                <span class="event-title">${ev.title}</span>
                <span class="event-tag">[${ev.typeName}] ${ev.dept ? `<span class="event-dept">(${ev.dept})</span>` : ''}</span>
            </div>
        `).join('') || '<div class="no-event">일정이 없습니다.</div>';

        card.innerHTML = `
            <div class="day-info">
                <span class="date-num">${d}</span>
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
