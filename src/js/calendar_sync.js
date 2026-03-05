/**
 * 학교 일정 통합 자동화 비서 (V1.9 - 꼬리말 방식 및 창체 최적화)
 * 
 * 기능: 학사(연간), 월중, 기획, 창체 데이터를 읽어 구글 캘린더로 자동 동기화
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
        ACADEMIC: '[연간]', // 학사 -> 연간으로 변경
        CREATIVE: '[창체]'
    }
};

/**
 * 전체 동기화 실행 함수
 */
function syncAllSchedules() {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    if (!calendar) return Logger.log("❌ 오류: 캘린더를 찾을 수 없습니다.");

    Logger.log("=== 프로세스 시작 (V1.9) ===");

    // 1. 기존 일정 클린업 (머리말/꼬리말 방식 모두 대응)
    cleanupGarbageEvents(calendar);

    // 2. 각 일정별 동기화
    syncAcademicSchedule(calendar);
    syncMonthlySchedule(calendar);
    syncPlanningMeeting(calendar);
    syncCreativeActivities(calendar);

    Logger.log("=== 모든 프로세스 종료 ===");
}

/**
 * 꼬리말/머리말 방식 및 쓰레기 데이터 삭제
 */
function cleanupGarbageEvents(calendar) {
    Logger.log("🧹 클린업 시작...");
    const startTime = new Date(CONFIG.YEAR, 2, 1);
    const endTime = new Date(CONFIG.YEAR + 1, 1, 28);
    const events = calendar.getEvents(startTime, endTime);
    let count = 0;

    // 이전 버전의 머리말들과 현재 꼬리말들 모두 체크
    const markers = ['[기획]', '[월중]', '[학사]', '[연간]', '[창체]'];

    events.forEach(event => {
        const title = event.getTitle();
        let shouldDelete = false;

        markers.forEach(m => {
            if (title.startsWith(m) || title.endsWith(m)) {
                // 특정 키워드 제거 후 남은 내용 분석
                const content = title.replace(m, "").replace("( )", "").trim();
                // 쓰레기 데이터이거나, 시간이 설정된 구버전 기획 일정이면 삭제
                if (isGarbageContent(content) || (m === '[기획]' && !event.isAllDayEvent())) {
                    shouldDelete = true;
                }
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
    return /^\d+$/.test(t) || /^[월화수목금]\d+$/.test(t) || t.length < 2;
}

/**
 * 1. 연간(학사)일정 파싱
 */
function syncAcademicSchedule(calendar) {
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
                const date = new Date(year, actualMonth - 1, parseInt(day));
                const title = eventName + " " + CONFIG.PREFIX.ACADEMIC;
                if (!isAlreadyExists(calendar, title, date)) {
                    calendar.createAllDayEvent(title, date);
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
                    const date = new Date(year, month - 1, day);
                    let content = [];
                    for (let c = 2; c < data[r].length; c++) {
                        const val = data[r][c]?.toString().trim() || "";
                        if (!isGarbageContent(val)) content.push(val);
                    }
                    if (content.length > 0) {
                        const summary = content[0].substring(0, 15) + (content.length > 1 ? " 외" : "");
                        const title = summary + " " + CONFIG.PREFIX.MONTHLY;
                        if (!isAlreadyExists(calendar, title, date)) {
                            calendar.createAllDayEvent(title, date, { description: content.join('\n') });
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
                        const date = new Date((m < 3 ? CONFIG.YEAR + 1 : CONFIG.YEAR), m - 1, d);
                        // 부서명은 괄호로, 말머리는 뒤로
                        const title = eventInfo + (dept ? " (" + dept + ")" : "") + " " + CONFIG.PREFIX.PLANNING;
                        if (!isAlreadyExists(calendar, title, date)) {
                            calendar.createAllDayEvent(title, date, { description: "파일: " + file.getUrl() });
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
    Logger.log(`[창체] ${data.length}행 분석 시작...`);

    for (let r = 1; r < data.length; r++) {
        const dateStr = data[r][0]?.toString().trim() || "";
        const topic6 = data[r][4]?.toString().trim() || "";
        const topic7 = data[r][5]?.toString().trim() || "";

        if (dateStr && (topic6 || topic7)) {
            // 날짜 인식 강화
            const dateMatch = dateStr.match(/(\d+)[월년\s]+(\d+)/);
            if (dateMatch) {
                const m = parseInt(dateMatch[1]), d = parseInt(dateMatch[2]);
                const date = new Date((m < 3 ? CONFIG.YEAR + 1 : CONFIG.YEAR), m - 1, d);

                // 창체 주제는 1글자여도 허용 (예: "창", "체" 등 특수 경우 대응)
                const f6 = (topic6 && !/^\d+$/.test(topic6)) ? topic6 : "";
                const f7 = (topic7 && !/^\d+$/.test(topic7)) ? topic7 : "";

                if (f6 || f7) {
                    const combined = (f6 && f7) ? `${f6} / ${f7}` : (f6 || f7);
                    const title = combined + " " + CONFIG.PREFIX.CREATIVE;
                    if (!isAlreadyExists(calendar, title, date)) {
                        calendar.createAllDayEvent(title, date, { description: `6교시: ${topic6}\n7교시: ${topic7}` });
                        Logger.log(`[창체] 추가완료: ${m}/${d} - ${combined}`);
                    }
                }
            }
        }
    }
}

function isAlreadyExists(calendar, title, date) {
    return calendar.getEventsForDay(date).some(e => e.getTitle() === title);
}
