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
 */
function doGet(e) {
    const data = getUnifiedData();
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

function getUnifiedData() {
    const allEvents = [];

    // 1. 학사 일정 추출
    try {
        const academicEvents = getAcademicData();
        allEvents.push(...academicEvents);
    } catch (e) { Logger.log("Academic data extraction error: " + e); }

    // 2. 창체 활동 추출
    try {
        const creativeEvents = getCreativeData();
        allEvents.push(...creativeEvents);
    } catch (e) { Logger.log("Creative data extraction error: " + e); }

    // 3. 월중 일정 추출
    try {
        const monthlyEvents = getMonthlyData();
        allEvents.push(...monthlyEvents);
    } catch (e) { Logger.log("Monthly data extraction error: " + e); }

    // 4. 기획 회의 추출
    try {
        const planningEvents = getPlanningData();
        allEvents.push(...planningEvents);
    } catch (e) { Logger.log("Planning data extraction error: " + e); }

    return allEvents;
}

function getAcademicData() {
    const events = [];
    const ss = SpreadsheetApp.openById(CONFIG.DOCS.ACADEMIC);
    const sheet = ss.getSheetByName('확정') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    let rowMonth = 3;
    for (let r = 0; r < data.length; r++) {
        if (data[r][0]) {
            const mMatch = data[r][0].toString().match(/(\d+)/);
            if (mMatch) rowMonth = parseInt(mMatch[1]);
        }
        for (let c = 2; c <= 10; c += 2) {
            const day = data[r][c];
            const eventName = data[r][c + 1]?.toString().trim() || "";
            if (day && !isNaN(day) && !isGarbageContent(eventName)) {
                let actualMonth = rowMonth;
                if (day > 20 && c < 6 && rowMonth > 1) actualMonth = rowMonth - 1;
                const year = (actualMonth < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;
                events.push({
                    date: `${year}-${actualMonth}-${day}`,
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
    const events = [];
    const ss = SpreadsheetApp.openById(CONFIG.DOCS.CREATIVE);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    for (let r = 1; r < data.length; r++) {
        const dateStr = data[r][0]?.toString().trim() || "";
        const topic6 = data[r][4]?.toString().trim() || "";
        const topic7 = data[r][5]?.toString().trim() || "";
        if (dateStr && (topic6 || topic7)) {
            const parts = dateStr.match(/\d+/g);
            if (parts && parts.length >= 2) {
                let m, d;
                if (parts.length >= 3) { m = parseInt(parts[1]); d = parseInt(parts[2]); }
                else { m = parseInt(parts[0]); d = parseInt(parts[1]); }
                const year = (m < 3 ? CONFIG.YEAR + 1 : CONFIG.YEAR);
                const f6 = (topic6 && !/^\d+$/.test(topic6)) ? topic6 : "";
                const f7 = (topic7 && !/^\d+$/.test(topic7)) ? topic7 : "";
                if (f6 || f7) {
                    const combined = (f6 && f7) ? `${f6} / ${f7}` : (f6 || f7);
                    events.push({
                        date: `${year}-${m}-${d}`,
                        title: combined,
                        type: 'creative',
                        typeName: '창체'
                    });
                }
            }
        }
    }
    return events;
}

function getMonthlyData() {
    const events = [];
    const folder = DriveApp.getFolderById(CONFIG.DOCS.MONTHLY);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    while (files.hasNext()) {
        const file = files.next();
        const ss = SpreadsheetApp.open(file);
        ss.getSheets().forEach(sheet => {
            if (!sheet.getName().includes('월')) return;
            const data = sheet.getDataRange().getValues();
            const monthMatch = sheet.getName().match(/(\d+)월/);
            if (!monthMatch) return;
            const month = parseInt(monthMatch[1]);
            const year = (month < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;
            for (let r = 0; r < data.length; r++) {
                let dVal = data[r][0];
                let day = (typeof dVal === 'number') ? dVal : (dVal?.toString().match(/(\d+)/) ? parseInt(dVal.toString().match(/(\d+)/)[1]) : null);
                if (day) {
                    let content = [];
                    for (let c = 2; c < data[r].length; c++) {
                        const val = data[r][c]?.toString().trim() || "";
                        if (!isGarbageContent(val)) content.push(val);
                    }
                    if (content.length > 0) {
                        events.push({
                            date: `${year}-${month}-${day}`,
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

function getPlanningData() {
    const events = [];
    const folder = DriveApp.getFolderById(CONFIG.DOCS.PLANNING);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    while (files.hasNext()) {
        const file = files.next();
        const ss = SpreadsheetApp.open(file);
        ss.getSheets().forEach(sheet => {
            if (!sheet.getName().includes('.')) return;
            const data = sheet.getDataRange().getValues();
            let lastDept = "";
            for (let r = 1; r < data.length; r++) {
                let dept = data[r][0]?.toString().trim() || "";
                if (dept) lastDept = dept; else dept = lastDept;
                const dateStr = data[r][1]?.toString() || "";
                const eventInfo = data[r][2]?.toString().trim() || "";
                if (dateStr && !isGarbageContent(eventInfo)) {
                    const mMatch = dateStr.match(/(\d+)[.\/](\d+)/);
                    if (mMatch) {
                        const m = parseInt(mMatch[1]), d = parseInt(mMatch[2]);
                        const year = (m < 3 ? CONFIG.YEAR + 1 : CONFIG.YEAR);
                        events.push({
                            date: `${year}-${m}-${d}`,
                            title: eventInfo,
                            dept: dept,
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
