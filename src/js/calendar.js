import { API_CONFIG } from './config.js';
import CryptoJS from 'crypto-js';

const CONFIG = {
    // API_CONFIG.SCRIPT_URL 사용 (config.js 연동)
    API_URL: API_CONFIG.SCRIPT_URL
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
            // [V3.6.1] 새로운 달을 보기 위해 현재 떠 있는 달들을 모두 접음
            const currentSeparators = document.querySelectorAll('.month-separator:not(.collapsed)');
            currentSeparators.forEach(sep => {
                const foldBtn = sep.querySelector('.month-fold-btn');
                if (foldBtn) sep.click(); // 강제 클릭으로 접기 트리거
            });

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
    let progress = 10;
    const interval = setInterval(() => {
        if (progress < 95) {
            // [V3.6.1] 지수 감쇄형 게이지: 목표치(98%)에 가까워질수록 느려짐
            const diff = (98 - progress) / 12;
            progress += Math.max(0.1, Math.random() * diff);
            showLoading(true, `${month}월 일정을 불러오고 있습니다...`, "서버로부터 데이터를 실시간으로 수신 중입니다.", Math.floor(progress));
        }
    }, 200);

    showLoading(true, `${month}월 일정을 불러오고 있습니다...`, "서버 응답 대기 중", 10);
    try {
        const response = await fetch(`${CONFIG.API_URL}?month=${month}&t=${Date.now()}`);
        clearInterval(interval);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        showLoading(true, `데이터 수신 완료!`, "화면을 준비합니다", 100);
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

        showLoading(true, `완료!`, "일정이 표시됩니다.", 100);
    } catch (e) {
        clearInterval(interval);
        console.error("Fetch Error:", e);
    } finally {
        setTimeout(() => {
            showLoading(false);
            // 로딩 종료 후 스크롤 실행 (v3.0.1)
            scrollToRelevantDate();
        }, 300);
    }
}

function eventsToRender(allEvents, year, month) {
    return allEvents.filter(ev => {
        const parts = ev.date.split('-').map(Number);
        return parts[0] === year && parts[1] === month;
    });
}

async function loadAllData() {
    let progress = 5;
    const interval = setInterval(() => {
        if (progress < 95) {
            const diff = (98 - progress) / 15;
            progress += Math.max(0.1, Math.random() * diff);
            showLoading(true, "전체 일정을 불러오는 중입니다...", "대용량 학사 데이터를 분석 중입니다.", Math.floor(progress));
        }
    }, 250);

    showLoading(true, "전체 일정을 불러오는 중입니다...", "서버 응답 대기 중", 5);
    try {
        const response = await fetch(`${CONFIG.API_URL}?all=true&t=${Date.now()}`);
        clearInterval(interval);

        showLoading(true, "데이터 수신 완료!", "전체 일정을 구성합니다", 100);
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

        showLoading(true, "로딩 완료!", "화면으로 이동합니다.", 100);
    } catch (e) {
        clearInterval(interval);
        console.error("Fetch All Error:", e);
    } finally {
        setTimeout(() => {
            showLoading(false);
            scrollToRelevantDate();
        }, 500);
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
        const currentDayIdx = dateObj.getDay();

        // 토요일(6), 일요일(0) 제외
        if (currentDayIdx === 0 || currentDayIdx === 6) continue;

        const m = dateObj.getMonth() + 1;

        if (m !== lastMonth) {
            const isPreviousMonth = (year === 2026 && m < currentMonth);
            const separator = document.createElement("div");
            separator.className = `month-separator ${isPreviousMonth ? 'collapsed' : ''}`;
            separator.innerHTML = `
                <div class="month-title-row">
                    <span>${m}월</span><span class="schedule-text">SCHEDULE</span>
                </div>
                <button class="month-fold-btn">${isPreviousMonth ? '펼치기' : '접기'}</button>
            `;

            // 접기 기능 연결
            separator.addEventListener('click', () => {
                const btn = separator.querySelector('.month-fold-btn');
                const isCollapsed = separator.classList.toggle('collapsed');
                btn.innerText = isCollapsed ? '펼치기' : '접기';

                // 다음 separator를 만날 때까지의 모든 day-card 토글
                let next = separator.nextElementSibling;
                while (next && !next.classList.contains('month-separator')) {
                    if (next.classList.contains('day-card')) {
                        next.style.display = isCollapsed ? 'none' : 'block';
                    }
                    next = next.nextElementSibling;
                }
            });

            listContainer.appendChild(separator);
            lastMonth = m;
        }

        // 이전 월인 경우 카드 초기 숨김 처리
        const isPreviousMonthCard = (year === 2026 && m < currentMonth);

        const dayEvents = events.filter(ev => {
            const parts = ev.date.split('-').map(Number);
            return parts[0] === year && parts[1] === month && parts[2] === d;
        });

        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayClasses = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const isToday = dateObj.toDateString() === new Date().toDateString();

        const card = document.createElement("div");
        card.id = `day-${year}-${m}-${d}`; // [v3.0.2] 고유 ID 부여
        card.className = `day-card ${isToday ? 'today' : ''} ${dayClasses[currentDayIdx]}`;

        // 이전 월이면 숨김 (V3.6.0)
        if (isPreviousMonthCard) {
            card.style.display = 'none';
        }

        const eventsHtml = dayEvents.map((ev, idx) => {
            if (ev.typeName === '창체') {
                return `
                <div class="event-item">
                    <span class="event-seq">${idx + 1}.</span>
                    <span class="event-title"><span class="event-tag changche">[창체]</span> ${ev.title}</span>
                </div>`;
            }
            return `
            <div class="event-item">
                <span class="event-seq">${idx + 1}.</span>
                <span class="event-title">${ev.title} <span class="event-tag">[${ev.typeName}]${ev.dept ? ` <span class="event-dept">(${ev.dept})</span>` : ''}</span></span>
            </div>`;
        }).join('') || '<div class="no-event">일정이 없습니다.</div>';

        card.innerHTML = `
            <div class="day-info">
                <span class="day-name">${m}월 ${d}일 (${days[currentDayIdx]})</span>
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
        const currentDayIdx = dateObj.getDay();

        // 토요일(6), 일요일(0) 제외
        if (currentDayIdx === 0 || currentDayIdx === 6) return;

        if (m !== lastMonth) {
            const isPreviousMonth = (y === 2026 && m < currentMonth);
            const separator = document.createElement("div");
            separator.className = `month-separator ${isPreviousMonth ? 'collapsed' : ''}`;
            separator.innerHTML = `
                <div class="month-title-row">
                    <span>${m}월</span><span class="schedule-text">SCHEDULE</span>
                </div>
                <button class="month-fold-btn">${isPreviousMonth ? '펼치기' : '접기'}</button>
            `;

            separator.addEventListener('click', () => {
                const btn = separator.querySelector('.month-fold-btn');
                const isCollapsed = separator.classList.toggle('collapsed');
                btn.innerText = isCollapsed ? '펼치기' : '접기';

                let next = separator.nextElementSibling;
                while (next && !next.classList.contains('month-separator')) {
                    if (next.classList.contains('day-card')) {
                        next.style.display = isCollapsed ? 'none' : 'block';
                    }
                    next = next.nextElementSibling;
                }
            });

            container.appendChild(separator);
            lastMonth = m;
        }

        const isPreviousMonthCard = (y === 2026 && m < currentMonth);

        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayClasses = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        const card = document.createElement("div");
        card.id = `day-${y}-${m}-${d}`; // [v3.0.2] 고유 ID 부여
        card.className = `day-card ${dayClasses[currentDayIdx]}`;

        if (isPreviousMonthCard) {
            card.style.display = 'none';
        }

        const dayEvents = grouped[dateStr];
        const eventsHtml = dayEvents.map((ev, idx) => {
            if (ev.typeName === '창체') {
                return `
                <div class="event-item">
                    <span class="event-seq">${idx + 1}.</span>
                    <span class="event-title"><span class="event-tag changche">[창체]</span> ${ev.title}</span>
                </div>`;
            }
            return `
            <div class="event-item">
                <span class="event-seq">${idx + 1}.</span>
                <span class="event-title">${ev.title} <span class="event-tag">[${ev.typeName}]${ev.dept ? ` <span class="event-dept">(${ev.dept})</span>` : ''}</span></span>
            </div>`;
        }).join('');

        card.innerHTML = `
            <div class="day-info">
                <span class="day-name">${m}월 ${d}일 (${days[currentDayIdx]})</span>
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

function showLoading(show, text = "불러오는 중...", subText = "", percent = null) {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
        overlay.style.display = show ? "flex" : "none";
        const p = overlay.querySelector('p');
        const percentEl = document.getElementById("loading-percent");
        const gaugeBar = document.getElementById("loading-gauge-bar");

        if (p) {
            const baseText = text.includes("...") ? text.split("...")[0] + "..." : text;
            p.childNodes[0].textContent = baseText + " ";
        }

        if (percentEl) {
            percentEl.innerText = percent !== null ? `(${Math.floor(percent)}%)` : "";
        }

        if (gaugeBar && percent !== null) {
            gaugeBar.style.width = `${percent}%`;
        }

        let subEl = overlay.querySelector('.loading-text-detail');
        if (subEl) subEl.innerText = subText;
    }
}

/**
 * [v3.0.1] 현재 날짜 또는 가장 최근 금요일로 똑똑하게 스크롤
 */
function scrollToRelevantDate() {
    const today = new Date();
    const day = today.getDay(); // 0:일, 1:월, ... 6:토
    let targetId = null;

    if (day === 1 || day === 0 || day === 6) {
        // 월요일(1) 또는 주말(0,6)이면 가장 최근의 금요일 찾기
        const lastFri = new Date(today);
        const diff = (day === 1) ? 3 : (day === 0 ? 2 : 1);
        lastFri.setDate(today.getDate() - diff);

        const m = lastFri.getMonth() + 1;
        const d = lastFri.getDate();
        const y = lastFri.getFullYear();

        // [v3.0.2] ID 기반 직접 탐색
        const targetCard = document.getElementById(`day-${y}-${m}-${d}`);
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.scrollBy(0, -90);
        } else {
            // ID로 못 찾을 경우 텍스트 검색 (Fallback)
            const cards = document.querySelectorAll('.day-card');
            for (let card of cards) {
                const dayName = card.querySelector('.day-name');
                if (dayName && dayName.innerText.includes(`${m}월 ${d}일`)) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    window.scrollBy(0, -90);
                    break;
                }
            }
        }
    } else {
        // 그 외 요일은 오늘로 스크롤
        const todayCard = document.querySelector('.day-card.today');
        if (todayCard) {
            // [V3.6.1] 더 정교한 스크롤: 뷰포트에 안착할 때까지 확인
            const scrollAction = () => {
                todayCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // 고정 버튼 높이(약 80-90px)를 고려한 보정
                setTimeout(() => window.scrollBy(0, -100), 500);
            };

            scrollAction();
        } else {
            // 카드가 아직 안 그려졌을 경우를 대비한 Observer (V3.6.1)
            const listContainer = document.getElementById('day-list');
            if (listContainer) {
                const observer = new MutationObserver(() => {
                    const found = document.querySelector('.day-card.today');
                    if (found) {
                        found.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        setTimeout(() => window.scrollBy(0, -100), 500);
                        observer.disconnect();
                    }
                });
                observer.observe(listContainer, { childList: true, subtree: true });
                setTimeout(() => observer.disconnect(), 3000); // 3초 후 포기
            }
        }
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

    async function fetchYearlyAcademicData() {
        const grid = document.getElementById('academic-grid');
        if (!grid) return;

        try {
            console.log("📡 연간 학사 일정 데이터 요청 중...", CONFIG.API_URL);

            // 초기 로딩 상태 (0%)
            grid.innerHTML = `
            <div style="text-align:center; padding: 60px; width:100%; display:flex; flex-direction:column; align-items:center; gap:15px;">
                <div class="loader-spinner"></div>
                <div style="font-size: 1.1rem; font-weight: 600; color: #333;">학사 일정을 가져오고 있습니다...</div>
                <div id="loading-progress" style="font-size: 0.9rem; color: #666;">연결 중 (0%)</div>
                <div style="width: 200px; height: 6px; background: #eee; border-radius: 3px; overflow: hidden;">
                    <div id="loading-bar" style="width: 0%; height: 100%; background: var(--primary-color, #4A90E2); transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;

            const progressText = document.getElementById('loading-progress');
            const progressBar = document.getElementById('loading-bar');

            // 진행률 업데이트 함수
            const updateProgress = (pct, msg) => {
                if (progressText) progressText.innerText = `${msg} (${pct}%)`;
                if (progressBar) progressBar.style.width = `${pct}%`;
            };

            // 1단계: 서버 연결 (25%)
            updateProgress(25, "서버 연결 중");

            const response = await fetch(`${CONFIG.API_URL}?type=yearly&t=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP 오류! 상태: ${response.status}`);

            // 2단계: 데이터 수신 (55%)
            updateProgress(55, "데이터 수신 중");
            const yearlyData = await response.json();

            // 3단계: 파싱 및 렌더링 준비 (85%)
            updateProgress(85, "일정 분석 및 구성 중");

            const dataVersion = yearlyData._version || "v2.29 이하 (Stale)";
            console.log(`📦 수신 데이터 버전: [${dataVersion}]`, yearlyData);

            if (!yearlyData || Object.keys(yearlyData).length <= 1) {
                grid.innerHTML = `<div style="text-align:center; padding: 50px; color:#666; width:100%;">
                등록된 연간 일정이 없습니다.<br>
                <small style="color:#999;">서버 버전: ${dataVersion} / 클라이언트 버전: v2.34</small>
            </div>`;
                return;
            }

            // 4단계: 완료 (100%)
            updateProgress(100, "로딩 완료");
            setTimeout(() => {
                renderAcademicGrid(yearlyData);
            }, 200);

        } catch (error) {
            console.error("❌ 데이터 로드 중 치명적 오류:", error);
            grid.innerHTML = `<div style="color:red; text-align:center; padding:50px;">데이터 로드 실패: ${error.message}</div>`;
        }
    }
    fetchYearlyAcademicData();
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

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    months.forEach(([year, month]) => {
        const monthBox = document.createElement('div');
        monthBox.className = 'academic-month-box';
        // 당월 식별을 위해 ID 또는 데이터 속성 부여
        if (year === currentYear && month === currentMonth) {
            monthBox.id = 'current-month-section';
        }

        monthBox.innerHTML = `
            <div class="academic-month-title">${month}월</div>
            <div class="academic-day-grid">
                <div class="academic-day-header">월</div>
                <div class="academic-day-header">화</div>
                <div class="academic-day-header">수</div>
                <div class="academic-day-header">목</div>
                <div class="academic-day-header">금</div>
                ${generateMonthHTML(year, month, data)}
            </div>
        `;
        grid.appendChild(monthBox);
    });

    // 당월 섹션으로 자동 스크롤 (v2.34 개선)
    setTimeout(() => {
        const currentSection = document.getElementById('current-month-section');
        const popupBody = document.querySelector('.academic-popup-body');

        if (currentSection && popupBody) {
            // scrollIntoView 대신 scrollTop 직접 제어로 정확도 향상
            const targetY = currentSection.offsetTop - 10;
            popupBody.scrollTo({
                top: targetY,
                behavior: 'smooth'
            });
        }
    }, 600); // 팝업 애니메이션 완료 기다림
}

function generateMonthHTML(year, month, events) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    let html = '';

    if (firstDay >= 1 && firstDay <= 5) {
        for (let i = 1; i < firstDay; i++) {
            html += '<div class="academic-day-cell other-month"></div>';
        }
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateStrNoZero = `${year}-${month}-${d}`;
        const eventData = events[dateStr] || events[dateStrNoZero] || null;
        const isToday = (dateStr === todayStr); // 오늘 여부 확인

        let eventText = "";
        let eventBg = "";
        let eventFontColor = "";

        if (typeof eventData === 'string') {
            eventText = eventData;
        } else if (eventData && typeof eventData === 'object') {
            eventText = eventData.text || "";
            eventBg = eventData.bg || "";
            eventFontColor = eventData.fc || ""; // 추가된 필드
        }

        const dayOfWeek = (firstDay + d - 1) % 7;
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // 주말 건너뜀

        let classes = 'academic-day-cell';
        if (eventText) classes += ' has-event';
        if (isToday) classes += ' is-today'; // [v2.33] 오늘 강조

        // 배경색 및 텍스트 대비 처리
        let styleStr = "";
        let textColor = eventFontColor || "#000000"; // 시트 글자색 우선, 없으면 검정
        let isDark = false;

        // 배경색 적용
        if (eventBg && eventBg !== "#ffffff" && eventBg !== "white" && eventBg !== "transparent") {
            styleStr = `style="background-color: ${eventBg};"`;

            // 만약 글자색이 명시되지 않았을 때만 자동 대비 계산
            if (!eventFontColor && eventBg.startsWith('#')) {
                const hex = eventBg.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                if (brightness < 140) {
                    isDark = true;
                    textColor = "#ffffff";
                }
            }

            // 빨간색 계열이면 공휴일 스타일 적용 (선택적)
            if (eventBg.startsWith('#')) { // Check again for hex format
                const hex = eventBg.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                if (r > 200 && g < 150 && b < 150) classes += ' holiday';
            }
        }

        // 글자색이 흰색 계열이면 shadow 추가 (가독성)
        const isWhiteText = textColor.toLowerCase() === "#ffffff" || textColor.toLowerCase() === "white";
        const textStyle = `style="color: ${textColor}; ${isWhiteText ? 'text-shadow: 0 1px 2px rgba(0,0,0,0.5);' : 'text-shadow: 0 0 1px #fff;'}"`;
        const numStyle = `style="color: ${isWhiteText ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)'};"`;

        html += `
            <div class="${classes}" ${styleStr}>
                <div class="academic-day-num" ${numStyle}>${d}</div>
                ${eventText ? `<div class="academic-day-event" ${textStyle} title="${eventText.replace(/\n/g, ', ')}">${eventText.replace(/\n/g, '<br/>')}</div>` : ''}
            </div>
        `;
    }

    return html;
}
