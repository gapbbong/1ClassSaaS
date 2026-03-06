import { API_CONFIG } from './config.js';

const CONFIG = {
    // GAS 프록시 URL (config.js에서 관리되는 SCRIPT_URL 사용)
    API_URL: API_CONFIG.SCRIPT_URL
};

let currentBaseDate = new Date(); // 현재 기준 날짜 (주간 이동용)

async function initCalendar() {
    showLoading(true);
    try {
        await renderWeek(currentBaseDate);
    } catch (error) {
        console.error("Calendar Load Error:", error);
        alert("일정 데이터를 불러오는데 실패했습니다. (GAS API 연결 확인 필요)");
    } finally {
        showLoading(false);
    }
}

async function renderWeek(baseDate) {
    const listContainer = document.getElementById("day-list");
    const monthTitle = document.getElementById("current-month-view");
    listContainer.innerHTML = "";

    const sun = new Date(baseDate);
    sun.setDate(baseDate.getDate() - baseDate.getDay());
    monthTitle.innerText = `${sun.getFullYear()}년 ${sun.getMonth() + 1}월`;

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dateMap = {};

    for (let i = 0; i < 7; i++) {
        const d = new Date(sun);
        d.setDate(sun.getDate() + i);
        const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        dateMap[dateKey] = { date: new Date(d), events: [] };
    }

    // 데이터 로드 (GAS API 호출)
    const allEvents = await fetchAllSchedules();

    // 이벤트 매칭
    allEvents.forEach(event => {
        const d = new Date(event.date);
        const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        if (dateMap[dateKey]) {
            dateMap[dateKey].events.push(event);
        }
    });

    // 렌더링
    Object.keys(dateMap).forEach((key, i) => {
        const item = dateMap[key];
        const isToday = item.date.toDateString() === new Date().toDateString();

        // 요일 클래스 지정
        const dayClasses = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayClass = dayClasses[i];

        const card = document.createElement("div");
        card.className = `day-card ${isToday ? 'today' : ''} ${dayClass}`;

        const eventsHtml = item.events.map(ev => `
            <div class="event-item">
                <span class="event-title">${ev.title}</span>
                <span class="event-tag">[${ev.typeName}]</span>
                ${ev.dept ? `<span class="event-dept">(${ev.dept})</span>` : ''}
            </div>
        `).join('') || '<div class="no-event">일정이 없습니다.</div>';

        card.innerHTML = `
            <div class="day-info">
                <span class="date-num">${item.date.getDate()}</span>
                <span class="day-name">${days[i]}요일</span>
            </div>
            <div class="event-content">
                ${eventsHtml}
            </div>
        `;
        listContainer.appendChild(card);
    });
}

async function fetchAllSchedules() {
    try {
        // GAS 웹 앱은 리다이렉트를 수행하므로 fetch 시 옵션 확인 (기본적으로 따라감)
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error("GAS API request failed");

        const data = await response.json();
        // date 문자열을 처리하기 쉽게 반환 (renderWeek에서 Date 객체로 변환)
        return data || [];
    } catch (e) {
        console.error("Fetch Unified Schedules Error:", e);
        return [];
    }
}

function parseCSV(text) {
    if (!text) return [];
    const rows = [];
    const lines = text.split(/\r?\n/);
    lines.forEach(line => {
        if (!line.trim()) return;
        // 쉼표로 구분하되 따옴표 내부의 쉼표는 무시하는 정규식
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (matches) {
            rows.push(matches.map(cell => cell.replace(/^"(.*)"$/, '$1')));
        } else {
            // 기본 쉼표 분할 (정규식 실패 시 대비)
            // 정규식 실패 시 대비 (기존 로직 유지)
            rows.push(line.split(',').map(cell => cell.replace(/^"(.*)"$/, '$1')));
        }
    });
    return rows;
}

function showLoading(show) {
    document.getElementById("loading-overlay").style.display = show ? "flex" : "none";
}

window.changeWeek = (offset) => {
    currentBaseDate.setDate(currentBaseDate.getDate() + (offset * 7));
    renderWeek(currentBaseDate);
};

// 초기화
document.addEventListener("DOMContentLoaded", initCalendar);
