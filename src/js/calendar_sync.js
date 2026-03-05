/**
 * 학교 일정 통합 자동화 비서 (V1.1 - Full Implementation)
 * 
 * 기능: 학사일정, 월중행사, 기획협의회 데이터를 읽어 구글 캘린더로 자동 동기화
 * 대상 캘린더: ks.cal153@gmail.com
 */

const CONFIG = {
    CALENDAR_ID: 'ks.cal153@gmail.com',
    YEAR: 2026,
    DOCS: {
        PLANNING: '1AdtB1ed5T3kAdwEZZN7EWVKUwK0-Q0bV', // 기획협의회 폴더 ID
        MONTHLY: '1qZ2NZPBJZiticNtzYUhwiBRkwUF2ORyb',  // 월중행사계획표 폴더 ID
        ACADEMIC: '1VKHdSREQbEcCTcFFgwWxAcNbMxSx_kYgcwxvyMcWeJk', // 학사일정 스프레드시트 ID
        CREATIVE: '1iqMpHw9VW7Xz6hwTFr7WUC36v4ibtZRuUHfsKVpexr8' // 창체운영계획 스프레드시트 ID
    },
    PREFIX: {
        PLANNING: '[기획]',
        MONTHLY: '[월중]',
        ACADEMIC: '[학사]',
        CREATIVE: '[창체]'
    }
};

function syncAllSchedules() {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    if (!calendar) return Logger.log("캘린더 권한이 없거나 ID가 틀립니다.");

    syncAcademicSchedule(calendar);
    syncMonthlySchedule(calendar);
    syncPlanningMeeting(calendar);
    syncCreativeActivities(calendar);
}

/**
 * 4. 창체운영계획 파싱
 * 구조: A열(날짜: "2026년 03 06일 금" 등), E열(6교시), F열(7교시)
 */
function syncCreativeActivities(calendar) {
    const ss = SpreadsheetApp.openById(CONFIG.DOCS.CREATIVE);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();

    Logger.log("[창체] 동기화 중...");

    for (let r = 1; r < data.length; r++) { // 1행(헤더) 제외
        const dateStr = data[r][0]?.toString() || "";
        const topic6 = data[r][4]?.toString().trim() || "";
        const topic7 = data[r][5]?.toString().trim() || "";

        if (dateStr && (topic6 || topic7)) {
            // 정규식 강화: "3월 6일" 형태 또는 "03 06일" 형태 모두 대응
            const dateMatch = dateStr.match(/(\d+)월\s*(\d+)일/) ||
                dateStr.match(/(\d+)\s+(\d+)일/);

            if (dateMatch) {
                const m = parseInt(dateMatch[1]);
                const d = parseInt(dateMatch[2]);
                const y = (m < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;
                const date = new Date(y, m - 1, d);

                // 유효한 주제인지 확인 (단순 숫자나 수업마커 제외)
                const filterGarbage = (t) => {
                    if (!t || /^\d+$/.test(t) || /^[월화수목금]\d+$/.test(t) || t.length < 2) return "";
                    return t;
                };

                const f6 = filterGarbage(topic6);
                const f7 = filterGarbage(topic7);

                if (f6 || f7) {
                    let combinedTopic = (f6 && f7) ? `${f6} / ${f7}` : (f6 || f7);
                    const title = CONFIG.PREFIX.CREATIVE + " " + combinedTopic;

                    if (!isAlreadyExists(calendar, title, date)) {
                        calendar.createAllDayEvent(title, date, { description: `6교시: ${topic6}\n7교시: ${topic7}` });
                        Logger.log(`[창체] 추가: ${m}/${d} - ${combinedTopic}`);
                    }
                }
            }
        }
    }
}

/**
 * 1. 학사일정 파싱 (그리드 레이아웃)
 * 구조: A열(월-숫자), C/E/G/I/K열(일), D/F/H/J/L열(내용)
 */
function syncAcademicSchedule(calendar) {
    const ss = SpreadsheetApp.openById(CONFIG.DOCS.ACADEMIC);
    const sheet = ss.getSheetByName('확정') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();

    Logger.log("[학사] 동기화 중 (시트: " + sheet.getName() + ")");

    let rowMonth = 3; // 기본 3월 시작 (학기 시작)
    for (let r = 0; r < data.length; r++) {
        const row = data[r];

        // A열에 월 정보(숫자 또는 'X월')가 있는 경우 업데이트
        if (row[0]) {
            const mMatch = row[0].toString().match(/(\d+)/);
            if (mMatch) rowMonth = parseInt(mMatch[1]);
        }

        // 월~금 (Index 2, 4, 6, 8, 10)
        for (let c = 2; c <= 10; c += 2) {
            const day = data[r][c];
            const eventName = data[r][c + 1]?.toString().trim() || "";

            // 유효한 형태인지 확인 (단순 숫자나 '월1', '화2' 같은 수업 시수 데이터는 제외)
            const isGarbage = !eventName ||
                /^\d+$/.test(eventName) ||
                /^[월화수목금]\d+$/.test(eventName) ||
                eventName.length < 2;

            if (day && !isNaN(day) && !isGarbage) {
                // 주간 단위 배치로 인해 이전 달 날짜가 포함된 경우 처리
                let actualMonth = rowMonth;
                if (day > 20 && c < 6 && rowMonth > 1) actualMonth = rowMonth - 1;

                const year = (actualMonth < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;
                const date = new Date(year, actualMonth - 1, parseInt(day));
                const title = CONFIG.PREFIX.ACADEMIC + " " + eventName;

                if (!isAlreadyExists(calendar, title, date)) {
                    calendar.createAllDayEvent(title, date, { description: "출처: 학사일정" });
                    Logger.log(`[학사] 추가: ${actualMonth}/${day} - ${eventName}`);
                }
            }
        }
    }
}

/**
 * 2. 월중행사계획표 파싱
 * 구조: 시트명 '26학년도3월', A열(날짜-혼합형), C열 이후(내용)
 */
function syncMonthlySchedule(calendar) {
    const folder = DriveApp.getFolderById(CONFIG.DOCS.MONTHLY);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);

    Logger.log("[월중] 동기화 중...");

    while (files.hasNext()) {
        const file = files.next();
        const ss = SpreadsheetApp.open(file);
        const sheets = ss.getSheets();

        sheets.forEach(sheet => {
            const sName = sheet.getName();
            if (!sName.includes('월')) return;

            const data = sheet.getDataRange().getValues();
            const monthMatch = sName.match(/(\d+)월/);
            if (!monthMatch) return;

            const month = parseInt(monthMatch[1]);
            const year = (month < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;

            for (let r = 0; r < data.length; r++) {
                let dayValue = data[r][0]; // A열
                if (!dayValue) continue;

                let day;
                if (typeof dayValue === 'number') {
                    day = dayValue;
                } else if (typeof dayValue === 'string') {
                    const match = dayValue.match(/(\d+)/);
                    if (match) day = parseInt(match[1]);
                } else if (dayValue instanceof Date) {
                    day = dayValue.getDate();
                }

                if (day) {
                    const date = new Date(year, month - 1, day);
                    let content = [];
                    for (let c = 2; c < data[r].length; c++) {
                        const val = data[r][c];
                        if (val && val.toString().trim().length > 1) {
                            content.push(val.toString().trim());
                        }
                    }

                    if (content.length > 0) {
                        const description = content.join('\n');
                        const summaryTitle = content[0].substring(0, 15) + (content.length > 1 ? " 외" : "");
                        const title = CONFIG.PREFIX.MONTHLY + " " + summaryTitle;

                        if (!isAlreadyExists(calendar, title, date)) {
                            calendar.createAllDayEvent(title, date, { description: description + "\n\n파일: " + file.getUrl() });
                            Logger.log(`[월중] 추가: ${month}/${day} - ${summaryTitle}`);
                        }
                    }
                }
            }
        });
    }
}

/**
 * 3. 기획협의회 파싱
 * 구조: B열에 '3.10.(화) 15:50' 또는 '3/10 15:50' 또는 '2026-03-10' 형식
 */
function syncPlanningMeeting(calendar) {
    const folder = DriveApp.getFolderById(CONFIG.DOCS.PLANNING);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);

    Logger.log("[기획] 동기화 중...");

    while (files.hasNext()) {
        const file = files.next();
        const ss = SpreadsheetApp.open(file);
        const sheets = ss.getSheets();

        sheets.forEach(sheet => {
            const name = sheet.getName();
            // 날짜 구분자(.)가 포함된 시트만 읽음
            if (!name.includes('.')) return;

            const data = sheet.getDataRange().getValues();
            for (let r = 1; r < data.length; r++) {
                const dept = data[r][0];
                const dateStr = data[r][1]?.toString() || "";
                const eventInfo = data[r][2]?.toString() || "";

                if (dateStr && eventInfo) {
                    // 정규식 강화: 다양한 날짜 포맷 대응
                    const timeMatch = dateStr.match(/(\d+)\.(\d+)\.?\(.\)\s*(\d+):(\d+)/) ||
                        dateStr.match(/(\d+)\/(\d+)\s*(\d+):(\d+)/);

                    if (timeMatch) {
                        const m = parseInt(timeMatch[1]);
                        const d = parseInt(timeMatch[2]);
                        const hh = parseInt(timeMatch[3]);
                        const mm = parseInt(timeMatch[4]);
                        const y = (m < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;

                        const start = new Date(y, m - 1, d, hh, mm);
                        const end = new Date(start.getTime() + 60 * 60 * 1000);
                        const title = CONFIG.PREFIX.PLANNING + " " + (dept ? dept + ": " : "") + eventInfo;

                        if (!isAlreadyExists(calendar, title, start)) {
                            calendar.createEvent(title, start, end, { description: "파일: " + file.getUrl() });
                            Logger.log(`[기획] 추가: ${m}/${d} ${hh}:${mm} - ${eventInfo}`);
                        }
                    }
                }
            }
        });
    }
}

/**
 * 중복 체크 (날짜/제목 기준)
 */
function isAlreadyExists(calendar, title, date) {
    const events = calendar.getEventsForDay(date);
    return events.some(e => e.getTitle() === title);
}
