/**
 * 학교 일정 통합 자동화 비서 (V1.0)
 * 
 * 기능: 학사일정, 월중행사, 기획협의회 데이터를 읽어 구글 캘린더로 자동 동기화
 * 대상 캘린더: ks.cal153@gmail.com
 */

const CONFIG = {
    CALENDAR_ID: 'ks.cal153@gmail.com',
    DOCS: {
        PLANNING: '1AdtB1ed5T3kAdwEZZN7EWVKUwK0-Q0bV', // 부장(기획)협의회 폴더 ID
        MONTHLY: '1qZ2NZPBJZiticNtzYUhwiBRkwUF2ORyb',  // 월중행사계획표 폴더 ID
        ACADEMIC: '1VKHdSREQbEcCTcFFgwWxAcNbMxSx_kYgcwxvyMcWeJk' // 학사일정 스프레드시트 ID
    },
    PREFIX: {
        PLANNING: '[기획]',
        MONTHLY: '[월중]',
        ACADEMIC: '[학사]'
    }
};

/**
 * 메인 실행 함수 (트리거로 설정)
 */
function syncAllSchedules() {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    if (!calendar) {
        Logger.log("캘린더를 찾을 수 없습니다: " + CONFIG.CALENDAR_ID);
        return;
    }

    // 1. 학사일정 동기화
    syncAcademicSchedule(calendar);

    // 2. 월중행사 동기화
    syncMonthlySchedule(calendar);

    // 3. 기획협의회 동기화
    syncPlanningMeeting(calendar);
}

/**
 * 1. 학사일정 파싱 및 동기화 (그리드 형태)
 */
function syncAcademicSchedule(calendar) {
    const ss = SpreadsheetApp.openById(CONFIG.DOCS.ACADEMIC);
    const sheet = ss.getSheetByName('확정') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();

    // '확정' 시트의 특수 그리드 구조를 분석하여 이벤트 추출 로직 구현 (예시)
    // 그리드 내에서 날짜와 텍스트가 있는 셀을 찾아 calendar.createAllDayEvent() 호출
    Logger.log("학사일정 파싱 시작...");
}

/**
 * 2. 월중행사계획표 파싱 및 동기화 (월별 파일)
 */
function syncMonthlySchedule(calendar) {
    const folder = DriveApp.getFolderById(CONFIG.DOCS.MONTHLY);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);

    while (files.hasNext()) {
        const file = files.next();
        // 파일명에서 연도/월 분석 (예: 26. 3월)
        // 시트 내부에서 날짜별 부서 일정 합쳐서 calendar.createEvent() 호출
    }
    Logger.log("월중행사 파싱 시작...");
}

/**
 * 3. 기획협의회 파싱 및 동기화 (주간 시트)
 */
function syncPlanningMeeting(calendar) {
    const folder = DriveApp.getFolderById(CONFIG.DOCS.PLANNING);
    // 최신 연도 폴더 안의 월별 시트 로딩
    // 시트명이 날짜 형태인 것을 찾아 내용 파싱 후 calendar.createEvent() 호출
    Logger.log("기획협의회 파싱 시작...");
}

/**
 * 기존 동일 일정 중복 방지 로직 (Helper)
 */
function isAlreadyExists(calendar, title, startTime) {
    const events = calendar.getEventsForDay(startTime);
    return events.some(e => e.getTitle() === title);
}
