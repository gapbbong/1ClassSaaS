/**
 * 학교 일정 통합 자동화 비서 (V1.5 - 자동 클린업 추가)
 * 
 * 기능: 학사일정, 월중행사, 기획협의회, 창체운영계획 데이터를 읽어 구글 캘린더로 자동 동기화
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

/**
 * 전체 동기화 실행 함수
 */
function syncAllSchedules() {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    if (!calendar) return Logger.log("❌ 오류: 캘린더를 찾을 수 없습니다.");

    Logger.log("=== 프로세스 시작 ===");

    // 1. 기존에 잘못 들어간 '숫자만 있는 일정' 청소
    cleanupGarbageEvents(calendar);

    // 2. 각 일정별 동기화
    syncAcademicSchedule(calendar);
    syncMonthlySchedule(calendar);
    syncPlanningMeeting(calendar);
    syncCreativeActivities(calendar);

    Logger.log("=== 모든 프로세스 종료 ===");
}

/**
 * [추가] 잘못된 일정(숫자만 있거나 수업교시) 삭제 함수
 */
function cleanupGarbageEvents(calendar) {
    Logger.log("🧹 클린업 시작 (불필요한 숫자 일정 삭제 중)...");
    const now = new Date();
    const startTime = new Date(CONFIG.YEAR, 2, 1); // 3월 1일
    const endTime = new Date(CONFIG.YEAR + 1, 1, 28); // 내년 2월 말까지

    const events = calendar.getEvents(startTime, endTime);
    let count = 0;

    events.forEach(event => {
        const title = event.getTitle();
        Object.values(CONFIG.PREFIX).forEach(prefix => {
            if (title.startsWith(prefix)) {
                const content = title.replace(prefix, "").trim();
                // 숫자만 있거나 '월1' 같은 수업교시 데이터면 삭제
                if (isGarbageContent(content)) {
                    event.deleteEvent();
                    count++;
                }
            }
        });
    });
    if (count > 0) Logger.log(`✅ 클린업 완료: 총 ${count}개의 불필요한 일정을 삭제했습니다.`);
}

/**
 * 쓰레기 데이터 판별 로직
 */
function isGarbageContent(text) {
    if (!text) return true;
    const t = text.toString().trim();
    // 숫자만 있거나, '월1' 같은 수업교시만 있거나, 1글자 이하면 무시
    return /^\d+$/.test(t) || /^[월화수목금]\d+$/.test(t) || t.length < 2;
}

/**
 * 1. 학사일정 파싱
 */
function syncAcademicSchedule(calendar) {
    const ss = SpreadsheetApp.openById(CONFIG.DOCS.ACADEMIC);
    const sheet = ss.getSheetByName('확정') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    let rowMonth = 3;

    Logger.log("[학사] 동기화 중...");

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
                const date = new Date(year, actualMonth - 1, parseInt(day));
                const title = CONFIG.PREFIX.ACADEMIC + " " + eventName;
                if (!isAlreadyExists(calendar, title, date)) {
                    calendar.createAllDayEvent(title, date, { description: "출처: 학사일정" });
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
    Logger.log("[월중] 동기화 중...");
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
                let dayValue = data[r][0];
                let day = (typeof dayValue === 'number') ? dayValue : (dayValue?.toString().match(/(\d+)/) ? parseInt(dayValue.toString().match(/(\d+)/)[1]) : null);
                if (day) {
                    const date = new Date(year, month - 1, day);
                    let content = [];
                    for (let c = 2; c < data[r].length; c++) {
                        const val = data[r][c]?.toString().trim() || "";
                        if (!isGarbageContent(val)) content.push(val);
                    }
                    if (content.length > 0) {
                        const title = CONFIG.PREFIX.MONTHLY + " " + content[0].substring(0, 15) + (content.length > 1 ? " 외" : "");
                        if (!isAlreadyExists(calendar, title, date)) {
                            calendar.createAllDayEvent(title, date, { description: content.join('\n') + "\n\n파일: " + file.getUrl() });
                        }
                    }
                }
            }
        });
    }
}

/**
 * 3. 기획협의회 파싱
 * 구조: 드라이브 폴더 내 '26.3월' 같은 스프레드시트 -> 그 안에 '26.3.9.' 같은 주 단위 시트
 * 시트 내부: A열(부서-병합됨), B열(날짜/시간), C열(내용)
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
            // 시트명이 '26.3.9.' 형태이거나 날짜 구분자(.)가 포함된 경우만 처리
            if (!name.includes('.')) return;

            const data = sheet.getDataRange().getValues();
            let lastDept = ""; // 병합된 셀 처리를 위한 변수

            // 보편적으로 5~7행 근처부터 데이터가 시작되나, 1행부터 탐색하며 유효 데이터 확인
            for (let r = 1; r < data.length; r++) {
                let dept = data[r][0]?.toString().trim() || "";
                if (dept) {
                    lastDept = dept; // 새로운 부서명이 나오면 업데이트
                } else {
                    dept = lastDept; // 빈 셀이면 이전 부서명 유지 (병합 셀 대응)
                }

                const dateStr = data[r][1]?.toString() || "";
                const eventInfo = data[r][2]?.toString().trim() || "";

                if (dateStr && !isGarbageContent(eventInfo)) {
                    // 다양한 날짜 포맷 대응 (M.D. 또는 M/D 및 시간)
                    const timeMatch = dateStr.match(/(\d+)\.(\d+)\.?\(.\)\s*(\d+):(\d+)/) ||
                        dateStr.match(/(\d+)\/(\d+)\s*(\d+):(\d+)/) ||
                        dateStr.match(/(\d+)\.(\d+)\.?\(.\)/); // 시간 없는 경우

                    if (timeMatch) {
                        const m = parseInt(timeMatch[1]);
                        const d = parseInt(timeMatch[2]);
                        const y = (m < 3) ? CONFIG.YEAR + 1 : CONFIG.YEAR;
                        const date = new Date(y, m - 1, d);
                        const title = CONFIG.PREFIX.PLANNING + " " + (dept ? dept + ": " : "") + eventInfo;

                        if (!isAlreadyExists(calendar, title, date)) {
                            calendar.createAllDayEvent(title, date, { description: "파일: " + file.getUrl() });
                            Logger.log(`[기획] 추가: ${m}/${d} - ${eventInfo}`);
                        }
                    }
                }
            }
        });
    }
}

/**
 * 4. 창체운영계획 파싱
 */
function syncCreativeActivities(calendar) {
    const ss = SpreadsheetApp.openById(CONFIG.DOCS.CREATIVE);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    Logger.log("[창체] 동기화 중...");
    for (let r = 1; r < data.length; r++) {
        const dateStr = data[r][0]?.toString() || "";
        const topic6 = data[r][4]?.toString().trim() || "";
        const topic7 = data[r][5]?.toString().trim() || "";
        if (dateStr) {
            const dateMatch = dateStr.match(/(\d+)월\s*(\d+)일/) || dateStr.match(/(\d+)\s+(\d+)일/);
            if (dateMatch) {
                const m = parseInt(dateMatch[1]);
                const d = parseInt(dateMatch[2]);
                const date = new Date((m < 3 ? CONFIG.YEAR + 1 : CONFIG.YEAR), m - 1, d);
                const f6 = isGarbageContent(topic6) ? "" : topic6;
                const f7 = isGarbageContent(topic7) ? "" : topic7;
                if (f6 || f7) {
                    const title = CONFIG.PREFIX.CREATIVE + " " + ((f6 && f7) ? `${f6} / ${f7}` : (f6 || f7));
                    if (!isAlreadyExists(calendar, title, date)) {
                        calendar.createAllDayEvent(title, date, { description: `6교시: ${topic6}\n7교시: ${topic7}` });
                    }
                }
            }
        }
    }
}

function isAlreadyExists(calendar, title, date) {
    return calendar.getEventsForDay(date).some(e => e.getTitle() === title);
}
