/* 
 * ✅ 원클(OneClass) + 학생 기초조사 통합 스크립트 (Survey Update v2.1)
 * - 등교수단, 등교시간 필드 추가
 * - 다문화여부 복수 선택 지원
 * - 학번 조회 시 날짜 기준 시트 자동 선택 (1/1~2/25: 이전 학년도, 2/26~: 신학년도)
 * - 프론트엔드 호환성 패치 (success, name 필드 반환)
 */

// --------------------------------------------------
// [설정] 
// --------------------------------------------------
const LOCK_WAIT_MS = 30000; 

const REQUIRED_HEADERS = [
  "PID", "학년", "반", "파일명", "사진저장링크", "학생별시트", "학번", "이름", 
  "학생폰", "부성명", "모성명", "부(연락처)", "모(연락처)", "집주소", "학적", 
  "출신중", "성별", "중학교성적", "혈액형", "MBTI", "형제", "인스타 id", 
  "좌우명", "나의꿈", "학습고민", "취미특기", "좋아하는 음식", "싫어하는 음식", "잠드는 시간", "수면시간", 
  "나의장점", "친한친구", "힘든점", "알레르기", "건강특이사항", "가족친밀도", 
  "반려동물", "자주하는게임", "게임실력", "거주가족", "어머니친밀도", "아버지친밀도",
  // --- [새 설문 항목 추가] ---
  "우편번호", "주연락대상", "주상담대상", "다문화여부", "다문화국가", 
  "등교수단", "등교시간", "졸업후진로", "가족종교", "종교활동", 
  "종교메시지", "잘한일", "못한일", "기타메시지", "입력시간"
];

// --------------------------------------------------
// [API 진입점]
// --------------------------------------------------
function doGet(e) {
  const action = e.parameter.action;

  if (action === "verifyStudent") return verifyStudent(e.parameter.num);
  if (action === "login") return checkLogin(e.parameter.id);
  if (action === "getSettings") return getSettings();
  if (action === "getClassStats") return getClassStats();
  if (action === "getStudentsByClass") return getStudentsByClass(e.parameter.grade, e.parameter.class);
  if (action === "getStudentRecords") return getStudentRecords(e.parameter.num);
  if (action === "getGroupRecords") return getGroupRecords(e.parameter.grade, e.parameter.class);
  if (action === "log") return recordLog(e.parameter);

  return getAllStudents();
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(LOCK_WAIT_MS)) {
      return createJSONOutput({ result: "error", message: "서버 혼잡 - 잠시 후 다시 시도해주세요." });
    }

    const p = e.parameter;
    const action = p.action;

    if (action === "updateStudentInfo") return updateStudentSheet(p.num, JSON.parse(p.surveyData));
    if (action === "bulkRecord") return saveBulkRecord(p);
    if (action === "delete") return deleteRecord(p);
    if (action === "log") return recordLog(p);
    
    return saveSingleRecord(p);

  } catch (error) {
    return createJSONOutput({ result: "error", message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// --------------------------------------------------
// [유틸리티]
// --------------------------------------------------
function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 학년도 계산 (1월1일~2월25일: 작년, 2월26일~12월31일: 올해)
 */
function getSchoolYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; 
  const day = now.getDate(); 

  // 2월 26일 이전이면 작년 학년도
  if (month === 1 || (month === 2 && day < 26)) {
    return year - 1;
  }
  return year; 
}

function getTargetSheetName() {
  const schoolYear = getSchoolYear(); 
  const yearSuffix = schoolYear.toString().slice(-2); 
  return "학생목록_" + yearSuffix;
}

function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(REQUIRED_HEADERS);
    sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// --------------------------------------------------
// [기본 조회]
// --------------------------------------------------
function getAllStudents() {
  const sheetName = getTargetSheetName();
  const sheet = getOrCreateSheet(sheetName);
  
  const data = sheet.getDataRange().getValues();
  if(data.length < 2) return createJSONOutput([]);

  const headers = data[0];
  const students = [];

  let recordCounts = {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const recordSheet = ss.getSheetByName("생활기록");
  
  if (recordSheet) {
    const rData = recordSheet.getDataRange().getValues();
    for (let i = 1; i < rData.length; i++) {
       if (rData[i][1]) { 
           let rNum = String(rData[i][1]);
           recordCounts[rNum] = (recordCounts[rNum] || 0) + 1;
       }
    }
  }

  for (let i = 1; i < data.length; i++) {
    let student = {};
    for (let j = 0; j < headers.length; j++) {
      student[headers[j]] = data[i][j];
    }
    let sNum = String(student['학번'] || student['번호'] || "");
    student['recordCount'] = recordCounts[sNum] || 0;
    students.push(student);
  }
  return createJSONOutput(students);
}

/**
 * 대시보드용 경량 통계 데이터 반환
 */
function getClassStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = getTargetSheetName();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet ? sheet.getDataRange().getValues() : [];
  
  const classStats = {};
  let grandTotal = 0;

  if (data.length > 1) {
    const headers = data[0];
    const gradeIdx = headers.indexOf("학년");
    const classIdx = headers.indexOf("반");
    
    // 생활기록 건수 집계
    const recordSheet = ss.getSheetByName("생활기록");
    const recordCounts = {};
    if (recordSheet) {
      const rData = recordSheet.getDataRange().getValues();
      for (let i = 1; i < rData.length; i++) {
        const num = String(rData[i][1]);
        if (num) recordCounts[num] = (recordCounts[num] || 0) + 1;
      }
    }

    // 학생 명단 순회하며 반별 합산
    for (let i = 1; i < data.length; i++) {
      const g = data[i][gradeIdx];
      const c = data[i][classIdx];
      const num = String(data[i][headers.indexOf("학번")] || data[i][headers.indexOf("번호")] || "");
      const count = recordCounts[num] || 0;
      
      const key = g + "-" + c;
      classStats[key] = (classStats[key] || 0) + count;
      grandTotal += count;
    }
  }

  return createJSONOutput({
    grandTotal: grandTotal,
    classStats: classStats
  });
}

/**
 * 특정 반 학생만 필터링하여 반환
 */
function getStudentsByClass(grade, classNum) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = getTargetSheetName();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet ? sheet.getDataRange().getValues() : [];
  if (data.length < 2) return createJSONOutput([]);

  const headers = data[0];
  const gradeIdx = headers.indexOf("학년");
  const classIdx = headers.indexOf("반");
  const students = [];

  // 생활기록 건수 집계 (필요한 경우에만)
  const recordSheet = ss.getSheetByName("생활기록");
  const recordCounts = {};
  if (recordSheet) {
    const rData = recordSheet.getDataRange().getValues();
    for (let i = 1; i < rData.length; i++) {
      const num = String(rData[i][1]);
      if (num) recordCounts[num] = (recordCounts[num] || 0) + 1;
    }
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][gradeIdx]) === String(grade) && String(data[i][classIdx]) === String(classNum)) {
      const student = {};
      for (let j = 0; j < headers.length; j++) {
        student[headers[j]] = data[i][j];
      }
      const sNum = String(student['학번'] || student['번호'] || "");
      student['recordCount'] = recordCounts[sNum] || 0;
      students.push(student);
    }
  }
  return createJSONOutput(students);
}

// --------------------------------------------------
// [기초조사]
// --------------------------------------------------
/**
 * 학번 조회 (이름 반환 추가)
 */
function verifyStudent(num) {
  const sheetName = getTargetSheetName();
  const sheet = getOrCreateSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  
  const headers = data[0];
  let numIndex = headers.indexOf("학번");
  if (numIndex === -1) numIndex = headers.indexOf("번호");
  let nameIndex = headers.indexOf("이름");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][numIndex]) === String(num)) {
      let student = {};
      for(let j=0; j<headers.length; j++) {
        student[headers[j]] = data[i][j];
      }
      // 프론트엔드 script.js 규격에 맞게 success, name 반환
      return createJSONOutput({ 
        success: true, 
        exists: true, 
        name: data[i][nameIndex] || "학생",
        data: student 
      });
    }
  }
  return createJSONOutput({ success: false, exists: false, message: "학번을 찾을 수 없습니다." });
}

function updateStudentSheet(studentNum, surveyData) {
  const sheetName = getTargetSheetName();
  const sheet = getOrCreateSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let numIndex = headers.indexOf("학번");
  if(numIndex === -1) numIndex = headers.indexOf("번호");

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][numIndex]) === String(studentNum)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (!studentNum || studentNum === "null") {
    return createJSONOutput({ result: "error", message: "학번 정보가 누락되었습니다. 다시 시도해주세요." });
  }

  if (rowIndex === -1) {
    // 신규 추가 로직을 막고 싶다면 여기서 에러 반환 가능
    // 현재는 기존 명단에 없으면 맨 아래 추가하는 방식 유지하되 학번은 필수
    rowIndex = sheet.getLastRow() + 1;
    sheet.getRange(rowIndex, numIndex + 1).setValue(studentNum); // 학번 강제 기입
  }

  for (let h = 0; h < headers.length; h++) {
    const key = headers[h];
    if (surveyData.hasOwnProperty(key)) {
       sheet.getRange(rowIndex, h + 1).setValue(surveyData[key]);
    }
    if (key === "입력시간") {
       const now = new Date();
       const timeStr = Utilities.formatDate(now, "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
       sheet.getRange(rowIndex, h + 1).setValue(timeStr);
    }
  }
  
  return createJSONOutput({ result: "success" });
}

// --------------------------------------------------
// [생활기록부]
// --------------------------------------------------
function getStudentRecords(num) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("생활기록");
  if (!sheet) return createJSONOutput([]);

  const data = sheet.getDataRange().getValues();
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(num)) {
       records.push({
         time: data[i][5],
         num: data[i][1],
         name: data[i][2],
         teacher: data[i][6],
         good: data[i][3],
         bad: data[i][4],
         detail: data[i][7]
       });
    }
  }
  records.sort((a, b) => new Date(b.time) - new Date(a.time));
  return createJSONOutput(records);
}

function getGroupRecords(grade, classNum) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("생활기록");
  if (!sheet) return createJSONOutput([]);

  const data = sheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < data.length; i++) {
    if (!data[i][1]) continue;

    records.push({
        time: data[i][5],
        num: data[i][1],
        name: data[i][2],
        teacher: data[i][6],
        good: data[i][3],
        bad: data[i][4],
        detail: data[i][7]
    });
  }
  records.sort((a, b) => new Date(b.time) - new Date(a.time));
  return createJSONOutput(records);
}

function saveBulkRecord(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("생활기록"); 
  if(!sheet) return createJSONOutput({result: "error", message: "생활기록 시트 없음"});

  const targets = JSON.parse(p.targets); 
  const now = new Date();
  const timeStr = Utilities.formatDate(now, "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");

  targets.forEach(stu => {
    const pid = new Date().getTime() + "_" + Math.floor(Math.random()*1000);
    sheet.appendRow([pid, stu.num, stu.name, p.good, p.bad, timeStr, p.teacher, p.detail]);
  });
  return createJSONOutput({result:"success", count: targets.length});
}

function saveSingleRecord(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("생활기록");
  if(!sheet) return createJSONOutput({result: "error", message: "생활기록 시트 없음"});
  
  const pid = new Date().getTime(); 
  sheet.appendRow([pid, p.num, p.name, p.good, p.bad, p.time, p.teacher, p.detail]);
  return createJSONOutput({result:"success"});
}

function deleteRecord(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("생활기록");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(p.num) && String(data[i][5]).includes(p.time.substring(0,10))) {
       sheet.deleteRow(i + 1);
       return createJSONOutput({result:"success"});
    }
  }
  return createJSONOutput({result:"fail", message: "삭제할 기록을 찾지 못함"});
}

function checkLogin(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Teachers");
  if(!sheet) return createJSONOutput({ success: false, message: "Teachers 시트 없음" });

  const data = sheet.getDataRange().getValues();
  let result = { success: false, name: "" };
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      result.success = true;
      result.name = data[i][1];
      break;
    }
  }
  return createJSONOutput(result);
}

function getSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Settings");
  const settings = { good: [], bad: [] };
  
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if(data[i][0]) settings.good.push(data[i][0]);
        if(data[i][1]) settings.bad.push(data[i][1]);
    }
  }
  return createJSONOutput(settings);
}

function recordLog(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("AccessLog");
  if (!sheet) {
     sheet = ss.insertSheet("AccessLog");
     sheet.appendRow(["Time", "ID", "Action", "Device"]);
  }
  sheet.appendRow([new Date(), p.id, p.action, p.device]); 
  return createJSONOutput({result:"logged"});
}
