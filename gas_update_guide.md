# 구글 앱스 스크립트(GAS) 수정 가이드

선생님, 학생 이름 옆에 "기록 건수"를 숫자로 표시하려면, **서버(구글 스프레드시트의 Apps Script)**가 학생 명단뿐만 아니라 "이 학생이 몇 건의 기록을 가지고 있는지"도 세어서 알려줘야 합니다.

지금은 그 정보가 없어서(사진에서 확인), Apps Script 코드를 아주 조금만 수정해주시면 됩니다.

## 1. 스크립트 편집기 열기
1. 구글 스프레드시트(생활기록 데이터가 있는 파일)를 엽니다.
2. 상단 메뉴에서 **확장 프로그램 > Apps Script**를 클릭합니다.

## 2. 코드 수정하기
오른쪽 코드 편집창에서 `getData` 또는 `getStudents`라는 이름의 함수(학생 명부를 가져오는 함수)를 찾아 아래처럼 수정해야 합니다.

만약 코드를 찾기 어려우시면, 기존에 있는 `doGet` 함수 근처에 아래 함수를 **새로 덮어쓰거나 추가**하시는 게 가장 빠를 수 있습니다.

### 핵심은 이 로직을 추가하는 것입니다:
```javascript
  // --- [추가할 로직] ---
  // 3. 생활기록 데이터 가져와서 카운팅하기
  var recordSheet = ss.getSheetByName("생활기록");
  var recordCounts = {}; // 학번별 기록 수 저장 { '1408': 3, '1409': 1 ... }
  
  if (recordSheet) {
    var recordData = recordSheet.getDataRange().getValues();
    // 헤더 제외하고 2번째 줄부터 확인
    for (var k = 1; k < recordData.length; k++) {
      var rNum = recordData[k][0]; // A열: 학번이라고 가정 ("학번" 컬럼이 아닐 경우 순서 확인 필요!)
      // 학번이 있으면 카운트 증가
      if (rNum) {
        // 문자열로 변환하여 카운트
        var key = String(rNum);
        if (recordCounts[key]) {
          recordCounts[key]++;
        } else {
          recordCounts[key] = 1;
        }
      }
    }
  }
  // --------------------
```

그리고 마지막에 학생 데이터를 `return` 하기 직전에, 이 카운트 정보를 넣어줘야 합니다.

```javascript
    // 학생 객체 만들기 (예시)
    var student = {
      // ... 기존 데이터 ...
      '학번': row[0],
      '이름': row[1],
      // [중요] 여기서 카운트 추가!
      'recordCount': recordCounts[String(row[0])] || 0 
    };
```

---

### [참고] 만약 'cors 문제 없는 gas code.txt' 기반이라면?

혹시 사용 중이신 코드가 `cors 문제 없는 gas code.txt`와 비슷하다면, 전체 `getData` 함수를 아래 코드로 **교체**하시면 완벽하게 동작할 것입니다.

```javascript
// 이 함수를 복사해서 기존 getData를 대체하거나 새로 만드세요.
function getData(action, paramNum) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 학생 명부 가져오기 ("명렬표" 시트 이름 확인하세요!)
  var sheet = ss.getSheetByName("명렬표"); 
  if (!sheet) return JSON.stringify([]);

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var students = [];

  // --- [기록 카운팅 로직 시작] ---
  var recordSheet = ss.getSheetByName("생활기록"); // "생활기록" 시트 이름 확인!
  var recordCounts = {};
  if (recordSheet) {
    var rData = recordSheet.getDataRange().getValues();
    // 생활기록 시트의 칼럼 순서를 확인하세요. 
    // 보통 1번째 열(A열)이 '학번'인 경우가 많지만, 만약 2번째 열(B열)이 학번이라면 rData[i][1]로 고쳐야 합니다.
    for (var i = 1; i < rData.length; i++) {
        var rNum = String(rData[i][0]); // A열이 학번이라고 가정
        if(rNum) {
            recordCounts[rNum] = (recordCounts[rNum] || 0) + 1;
        }
    }
  }
  // --- [기록 카운팅 로직 끝] ---

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var student = {};
    for (var j = 0; j < headers.length; j++) {
      student[headers[j]] = row[j];
    }
    
    // [핵심] 학생 객체에 recordCount 심어주기
    // 명렬표의 '학번' 컬럼 헤더 이름이 '학번'이어야 함
    var stuNum = String(student['학번']);
    student['recordCount'] = recordCounts[stuNum] || 0;
    
    students.push(student);
  }

  return JSON.stringify(students);
}
```

## 3. 배포 업데이트 (필수!)
코드를 수정하셨으면 꼭 **[배포] > [새 배포]**를 눌러서 버전을 업데이트해주셔야 적용됩니다.
