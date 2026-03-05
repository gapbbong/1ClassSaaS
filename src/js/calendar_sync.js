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
 */
function syncAcademicSchedule(calendar) {
    const ss = SpreadsheetApp.openById(CONFIG.DOCS.ACADEMIC);
    const sheet = ss.getSheetByName('확정') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();

    Logger.log("학사일정 동기화 중...");

    let currentMonth = 1;
    for (let r = 0; r < data.length; r++) {
        const row = data[r];
        // A열에 월 정보가 있는 경우 업데이트
        if (row[0] && typeof row[0] === 'string' && row[0].includes('월')) {
            currentMonth = parseInt(row[0]);
        }

        // C(2), E(4), G(6), I(8), K(10) 열이 '일' 정보
        // D(3), F(5), H(7), J(9), L(11) 열이 '이벤트' 정보
        for (let c = 2; c <= 10; c += 2) {
            const day = data[r][c];
            const eventName = data[r][c + 1];

            if (day && typeof day === 'number' && eventName && eventName.toString().trim() !== "") {
                const year = (currentMonth < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR; // 1,2월은 다음해
                const date = new Date(year, currentMonth - 1, day);
                const title = CONFIG.PREFIX.ACADEMIC + " " + eventName;

                if (!isAlreadyExists(calendar, title, date, true)) {
                    calendar.createAllDayEvent(title, date, { description: "출처: 학사일정 시트" });
                    Logger.log(`[학사] 추가: ${currentMonth}/${day} - ${eventName}`);
                }
            }
        }
    }
}

/**
 * 2. 월중행사계획표 파싱
 */
function syncMonthlySchedule(calendar) {
    const folder = DriveApp.getFolderById(CONFIG.DOCS.MONTHLY);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);

    Logger.log("월중행사 동기화 중...");

    while (files.hasNext()) {
        const file = files.next();
        const ss = SpreadsheetApp.open(file);
        const sheets = ss.getSheets();

        sheets.forEach(sheet => {
            if (!sheet.getName().includes('학년도')) return;

            const data = sheet.getDataRange().getValues();
            const monthMatch = sheet.getName().match(/(\d+)월/);
            if (!monthMatch) return;

            const month = parseInt(monthMatch[1]);
            const year = (month < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;

            for (let r = 0; r < data.length; r++) {
                const dayValue = data[r][0]; // A열: 날짜
                if (dayValue && !isNaN(dayValue)) {
                    const day = parseInt(dayValue);
                    const date = new Date(year, month - 1, day);

                    // C열 이후의 모든 텍스트를 하나로 합침
                    let content = [];
                    for (let c = 2; c < data[r].length; c++) {
                        if (data[r][c]) content.push(data[r][c].toString().trim());
                    }

                    if (content.length > 0) {
                        const description = content.join('\n');
                        const summaryTitle = content[0].substring(0, 15) + (content.length > 1 ? " 외" : "");
                        const title = CONFIG.PREFIX.MONTHLY + " " + summaryTitle;

                        if (!isAlreadyExists(calendar, title, date, true)) {
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
 */
function syncPlanningMeeting(calendar) {
    const folder = DriveApp.getFolderById(CONFIG.DOCS.PLANNING);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);

    Logger.log("기획협의회 동기화 중...");

    while (files.hasNext()) {
        const file = files.next();
        const ss = SpreadsheetApp.open(file);
        const sheets = ss.getSheets();

        sheets.forEach(sheet => {
            // 시트명이 '26.3.9.' 형태인지 확인
            const name = sheet.getName();
            if (!name.match(/^\d+\.\d+\.\d+\.?$/)) return;

            const data = sheet.getDataRange().getValues();
            for (let r = 1; r < data.length; r++) {
                const dept = data[r][0];     // 부서명
                const dateStr = data[r][1];   // 일자 (예: 3.10.(화) 15:50)
                const eventInfo = data[r][2]; // 행사내역

                if (dateStr && eventInfo) {
                    // 시간 파싱 로직 하드코딩 (학교 포맷 특화)
                    const timeMatch = dateStr.match(/(\d+)\.(\d+)\.?\(.\)\s*(\d+):(\d+)/);
                    if (timeMatch) {
                        const m = parseInt(timeMatch[1]);
                        const d = parseInt(timeMatch[2]);
                        const hh = parseInt(timeMatch[3]);
                        const mm = parseInt(timeMatch[4]);
                        const y = (m < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;

                        const start = new Date(y, m - 1, d, hh, mm);
                        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1시간 기본
                        const title = CONFIG.PREFIX.PLANNING + " " + dept + ": " + eventInfo;

                        if (!isAlreadyExists(calendar, title, start, false)) {
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
function isAlreadyExists(calendar, title, date, isAllDay) {
    const events = calendar.getEventsForDay(date);
    return events.some(e => e.getTitle() === title);
}
