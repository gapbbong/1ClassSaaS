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
        ACADEMIC: '1VKHdSREQbEcCTcFFgwWxAcNbMxSx_kYgcwxvyMcWeJk' // 학사일정 스프레드시트 ID
    },
    PREFIX: {
        PLANNING: '[기획]',
        MONTHLY: '[월중]',
        ACADEMIC: '[학사]'
    }
};

function syncAllSchedules() {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    if (!calendar) return Logger.log("캘린더 권한이 없거나 ID가 틀립니다.");

    syncAcademicSchedule(calendar);
    syncMonthlySchedule(calendar);
    syncPlanningMeeting(calendar);
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
            const eventName = data[r][c + 1];

            if (day && !isNaN(day) && eventName && eventName.toString().trim().length > 1) {
                // 주간 단위 배치로 인해 이전 달 날짜가 포함된 경우 처리 (예: 4월 1주 로우에 3/30이 있는 경우)
                let actualMonth = rowMonth;
                if (day > 20 && c < 6) { // 월/화인데 날짜가 크면 이전 달일 확률 높음
                    if (rowMonth > 1) actualMonth = rowMonth - 1;
                }

                const year = (actualMonth < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;
                const date = new Date(year, actualMonth - 1, parseInt(day));
                const title = CONFIG.PREFIX.ACADEMIC + " " + eventName.toString().trim();

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
