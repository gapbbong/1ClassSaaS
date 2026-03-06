/**
 * 학교 일정 통합 자동화 비서 (V2.11 - API 기능 추가 및 창체 파싱 해결)
 */

const CONFIG = {
    CALENDAR_ID: 'ks.cal153@gmail.com',
    YEAR: 2026,
    DOCS: {
        PLANNING: '1AdtB1ed5T3kAdwEZZN7EWVKUwK0-Q0bV',
        MONTHLY: '1qZ2NZPBJZiticNtzYUhwiBRkwUF2ORyb',
        ACADEMIC: '1VKHdSREQbEcCTcFFgwWxAcNbMxSx_kYgcwxvyMcWeJk',
        CREATIVE: '1iqMpHw9VW7Xz6hwTFr7WUC36v4ibtZRuUHfsKVpexr8'
    },
    PREFIX: {
        PLANNING: '[기획]',
        MONTHLY: '[월중]',
        ACADEMIC: '[연간]',
        CREATIVE: '[창체]'
    }
};

/**
 * 외부(웹 앱)에서 데이터를 요청할 때 호출되는 진입점
 * @param {Object} e - e.parameter.month (숫자) 또는 e.parameter.all (true)
 */
function doGet(e) {
    const month = e && e.parameter && e.parameter.month ? parseInt(e.parameter.month) : null;
    const isAll = e && e.parameter && e.parameter.all === 'true';

    // 특정 월만 요청한 경우 해당 월만 수집하여 속도 극대화
    const data = getUnifiedData(isAll ? null : month);

    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

function syncAllSchedules() {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    if (!calendar) return Logger.log("❌ 오류: 캘린더를 찾을 수 없습니다.");

    Logger.log("=== 프로세스 시작 (V2.11) ===");
    cleanupGarbageEvents(calendar);
    syncAcademicSchedule(calendar);
    syncMonthlySchedule(calendar);
    syncPlanningMeeting(calendar);
    syncCreativeActivities(calendar);
    Logger.log("=== 모든 프로세스 종료 ===");
}

function getUnifiedData(requestedMonth = null) {
    let allEvents = [];

    // 1. 학사 일정 추출
    try {
        let academicEvents = getAcademicData();
        if (requestedMonth) {
            academicEvents = academicEvents.filter(ev => parseInt(ev.date.split('-')[1]) === requestedMonth);
        }
        allEvents.push(...academicEvents);
    } catch (e) { Logger.log("Academic data error: " + e); }

    // 2. 창체 활동 추출
    try {
        let creativeEvents = getCreativeData();
        if (requestedMonth) {
            creativeEvents = creativeEvents.filter(ev => parseInt(ev.date.split('-')[1]) === requestedMonth);
        }
        allEvents.push(...creativeEvents);
    } catch (e) { Logger.log("Creative data error: " + e); }

    // 3. 월중 일정 추출 (파일 필터링으로 속도 향상)
    try {
        const monthlyEvents = getMonthlyData(requestedMonth);
        allEvents.push(...monthlyEvents);
    } catch (e) { Logger.log("Monthly data error: " + e); }

    // 4. 기획 회의 추출
    try {
        const planningEvents = getPlanningData(requestedMonth);
        allEvents.push(...planningEvents);
    } catch (e) { Logger.log("Planning data error: " + e); }

    // 최종 중복 제거 (날짜 + 제목(공백제거) + 타입)
    const uniqueMap = new Map();
    allEvents.forEach(ev => {
        const normalizedTitle = ev.title.replace(/\s+/g, '');
        const key = `${ev.date}|${normalizedTitle}|${ev.type}`;
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, ev);
        }
    });

    return Array.from(uniqueMap.values());
}

/**
 * 날짜 포맷 헬퍼 (YYYY-MM-DD)
 */
function formatDate(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * 날짜 데이터를 Date 객체로 파싱하는 통합 헬퍼
 */
function parseDateValue(val) {
    if (!val) return null;
    if (val instanceof Date) return val;

    const dateStr = val.toString().trim();
    // '3.6', '3/6', '2026-03-06' 등 모든 숫자 패턴 추출
    const parts = dateStr.match(/\d+/g);
    if (!parts || parts.length < 2) return null;

    let y = CONFIG.YEAR, m, d;
    if (parts.length >= 3) {
        y = parseInt(parts[0]);
        if (y < 100) y += 2000;
        m = parseInt(parts[1]);
        d = parseInt(parts[2]);
    } else {
        // 월.일 형태 (예: 3.6)
        m = parseInt(parts[0]);
        d = parseInt(parts[1]);
        // 3월 이후는 올해, 1~2월은 내년으로 간주 (학년도 기준)
        y = (m < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;
    }

    // 유효한 날짜인지 검증
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;

    return new Date(y, m - 1, d);
}

function getAcademicData() {
    const events = [];
    const ss = SpreadsheetApp.openById(CONFIG.DOCS.ACADEMIC);
    const sheet = ss.getSheetByName('확정') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    let rowMonth = 3;
    for (let r = 0; r < data.length; r++) {
        // A열에 월 정보(숫자)가 있는지 확인
        const cellA = data[r][0]?.toString().trim();
        if (cellA) {
            const mMatch = cellA.match(/(\d+)/);
            if (mMatch) rowMonth = parseInt(mMatch[1]);
        }

        // C(2), E(4), G(6), I(8), K(10) 열이 일자
        // D(3), F(5), H(7), J(9), L(11) 열이 행사명
        for (let c = 2; c <= 10; c += 2) {
            const dayValue = data[r][c];
            const eventName = data[r][c + 1]?.toString().trim() || "";

            if (dayValue && !isNaN(dayValue) && eventName && !isGarbageContent(eventName)) {
                const day = parseInt(dayValue);
                // 1, 2월은 다음 학년도(학년도 개념이 아닌 실제 연도로 계산)
                const year = (rowMonth < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;
                events.push({
                    date: formatDate(year, rowMonth, day),
                    title: eventName,
                    type: 'academic',
                    typeName: '학사'
                });
            }
        }
    }
    return events;
}

function getCreativeData() {
    Logger.log("🔍 창체 데이터 정밀 수집 시작...");
    const events = [];
    const ss = SpreadsheetApp.openById(CONFIG.DOCS.CREATIVE);
    const sheets = ss.getSheets();

    // 26, 2026, 창체 키워드 조합으로 올해 시트 검색
    const sheet = sheets.find(s => (s.getName().includes('26') || s.getName().includes('2026')) && s.getName().includes('창체')) ||
        sheets.find(s => s.getName().includes('창체')) ||
        sheets[0];

    Logger.log("📄 대상 창체 시트: [" + sheet.getName() + "]");
    const data = sheet.getDataRange().getValues();
    let successCount = 0;

    for (let r = 0; r < data.length; r++) {
        const row = data[r];
        let parsedDate = null;
        let dateColIdx = -1;

        // 1. 해당 행에서 날짜(A~C열 위주 검색)를 먼저 찾음
        for (let c = 0; c < Math.min(row.length, 3); c++) {
            parsedDate = parseDateValue(row[c]);
            if (parsedDate) {
                dateColIdx = c;
                break;
            }
        }

        if (!parsedDate) continue;

        const dateStr = formatDate(parsedDate.getFullYear(), parsedDate.getMonth() + 1, parsedDate.getDate());

        // 2. 날짜 이후의 모든 컬럼에서 내용을 수집
        let rowContents = [];
        for (let c = dateColIdx + 1; c < row.length; c++) {
            const val = row[c]?.toString().trim() || "";
            if (val && !isGarbageContent(val)) {
                if (!rowContents.includes(val)) rowContents.push(val);
            }
        }

        if (rowContents.length > 0) {
            const finalTitle = rowContents.join(' / ');
            events.push({
                date: dateStr,
                title: finalTitle,
                type: 'creative',
                typeName: '창체'
            });
            successCount++;
            if (successCount < 5) Logger.log(`✅ [${dateStr}] 샘플 데이터: ${finalTitle}`);
        }
    }
    Logger.log(`📊 창체 수집 완료: 총 ${successCount}건 추출됨`);
    return events;
}

function getMonthlyData(requestedMonth) {
    const events = [];
    const folder = DriveApp.getFolderById(CONFIG.DOCS.MONTHLY);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    while (files.hasNext()) {
        const file = files.next();
        const fileName = file.getName();

        // 요청한 월이 있는 경우 파일명 필터링
        if (requestedMonth) {
            const mStr = requestedMonth.toString();
            const mStrPad = mStr.padStart(2, '0');
            if (!fileName.includes(mStr + '월') && !fileName.includes(mStrPad + '월')) continue;
        }

        const ss = SpreadsheetApp.open(file);
        ss.getSheets().forEach(sheet => {
            const sheetName = sheet.getName();
            if (!sheetName.includes('월')) return;

            // 학년도 필터링: 작년(2025/25) 시트는 명시적으로 제외 (올해 시트가 있는 경우)
            if (sheetName.includes('2025') || sheetName.includes('25')) {
                const has2026Sheet = ss.getSheets().some(s => s.getName().includes('2026') || s.getName().includes('26'));
                if (has2026Sheet) {
                    Logger.log(`🚫 작년 시트 제외: ${sheetName}`);
                    return;
                }
            }

            const data = sheet.getDataRange().getValues();
            const monthMatch = sheetName.match(/(\d+)월/);
            if (!monthMatch) return;
            const month = parseInt(monthMatch[1]);

            if (requestedMonth && month !== requestedMonth) return;

            Logger.log(`📂 월중행사 시트 분석 중: ${sheetName}`);

            const year = (month < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;
            for (let r = 0; r < data.length; r++) {
                let dVal = data[r][0];
                let day = (typeof dVal === 'number') ? dVal : (dVal?.toString().match(/(\d+)/) ? parseInt(dVal.toString().match(/(\d+)/)[1]) : null);
                if (day) {
                    let content = [];
                    for (let c = 2; c < data[r].length; c++) {
                        const val = data[r][c]?.toString().trim() || "";
                        if (val && !isGarbageContent(val)) {
                            if (!content.includes(val)) content.push(val);
                        }
                    }
                    if (content.length > 0) {
                        events.push({
                            date: formatDate(year, month, day),
                            title: content.join(' / '),
                            type: 'monthly',
                            typeName: '월중'
                        });
                    }
                }
            }
        });
    }
    return events;
}

function getPlanningData(requestedMonth = null) {
    const events = [];
    const folder = DriveApp.getFolderById(CONFIG.DOCS.PLANNING);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);

    while (files.hasNext()) {
        const file = files.next();
        const ss = SpreadsheetApp.open(file);
        const sheets = ss.getSheets();

        sheets.forEach(sheet => {
            const sheetName = sheet.getName();
            // "26.3.9" 또는 "26.3.23" 등 날짜 형식이 포함된 시트만 대상
            const dateMatch = sheetName.match(/\d+\.(\d+)\.\d+/);
            if (!dateMatch) return;

            const month = parseInt(dateMatch[1]);
            if (requestedMonth && month !== requestedMonth) return;

            const data = sheet.getDataRange().getValues();
            let lastDept = "";

            for (let r = 5; r < data.length; r++) { // 헤더(부서명/일자) 아래부터 시작
                let dept = data[r][0]?.toString().trim() || "";
                if (dept) lastDept = dept; else dept = lastDept;

                const dateRaw = data[r][1]?.toString().trim() || "";
                const content = data[r][2]?.toString().trim() || "";

                if (dateRaw && content && !isGarbageContent(content) && content !== "없음") {
                    // "3.10.(화)" 또는 "3.10." 또는 "3.10" 등에서 월/일 추출
                    const mMatch = dateRaw.match(/(\d+)\.(\d+)/);
                    if (mMatch) {
                        const m = parseInt(mMatch[1]), d = parseInt(mMatch[2]);
                        const year = (m < 3 ? CONFIG.YEAR + 1 : CONFIG.YEAR);
                        events.push({
                            date: formatDate(year, m, d),
                            title: content,
                            dept: lastDept,
                            type: 'planning',
                            typeName: '기획'
                        });
                    }
                }
            }
        });
    }
    return events;
}

function cleanupGarbageEvents(calendar) {
    Logger.log("🧹 클린업 시작 (오늘 이후 일정 대상, 구버전 머리말 강제 삭제)...");
    const startTime = new Date();
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(CONFIG.YEAR + 1, 1, 28);
    const events = calendar.getEvents(startTime, endTime);
    let count = 0;
    const markers = ['[기획]', '[월중]', '[학사]', '[연간]', '[창체]'];
    events.forEach(event => {
        const title = event.getTitle();
        let shouldDelete = false;
        markers.forEach(m => {
            if (title.startsWith(m)) shouldDelete = true;
            else if (title.endsWith(m)) {
                const content = title.replace(m, "").replace("( )", "").trim();
                if (isGarbageContent(content) || (m === '[기획]' && !event.isAllDayEvent())) shouldDelete = true;
            }
        });
        if (shouldDelete) {
            event.deleteEvent();
            count++;
        }
    });
    if (count > 0) Logger.log(`✅ 클린업 완료: ${count}개 삭제`);
}

function isGarbageContent(text) {
    if (!text) return true;
    const t = text.toString().trim();
    return /^\d+$/.test(t) || /^[월화수목금]\d+$/.test(t) || (t.length < 2 && t !== "창" && t !== "체");
}

function syncAcademicSchedule(calendar) {
    const academicEvents = getAcademicData();
    academicEvents.forEach(ev => {
        const [y, m, d] = ev.date.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const title = ev.title + " " + CONFIG.PREFIX.ACADEMIC;
        if (!isAlreadyExists(calendar, title, date)) calendar.createAllDayEvent(title, date);
    });
}

function syncMonthlySchedule(calendar) {
    const monthlyEvents = getMonthlyData();
    monthlyEvents.forEach(ev => {
        const [y, m, d] = ev.date.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const title = ev.title.substring(0, 20) + " " + CONFIG.PREFIX.MONTHLY;
        if (!isAlreadyExists(calendar, title, date)) calendar.createAllDayEvent(title, date);
    });
}

function syncPlanningMeeting(calendar) {
    const planningEvents = getPlanningData();
    planningEvents.forEach(ev => {
        const [y, m, d] = ev.date.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const title = ev.title + " " + CONFIG.PREFIX.PLANNING;
        if (!isAlreadyExists(calendar, title, date)) calendar.createAllDayEvent(title, date);
    });
}

function syncCreativeActivities(calendar) {
    const creativeEvents = getCreativeData();
    creativeEvents.forEach(ev => {
        const [y, m, d] = ev.date.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const title = ev.title + " " + CONFIG.PREFIX.CREATIVE;
        if (!isAlreadyExists(calendar, title, date)) calendar.createAllDayEvent(title, date);
    });
}

function isAlreadyExists(calendar, title, date) {
    return calendar.getEventsForDay(date).some(e => e.getTitle() === title);
}
