<?php
// DB 연결
$pdo = new PDO("mysql:host=localhost;dbname=students25_db;charset=utf8", "root", "");

// 학생 목록 불러오기
$stmt = $pdo->query("SELECT id, grade, class, student_id, name FROM students");
$students = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 자동 경로 생성 및 DB 업데이트
foreach ($students as $stu) {
  $studentNumber = intval($stu['student_id']); // 문자열 → 정수 변환

  // 예: photos/1-2/01고강민.jpg
  $filename = sprintf("photos/%d-%d/%02d%s.jpg", 
    $stu['grade'], 
    $stu['class'], 
    $studentNumber % 100, 
    $stu['name']
  );
  $fullPath = __DIR__ . "/$filename";

  // 파일 존재 여부에 따라 경로 설정
  $pathToSave = file_exists($fullPath) ? $filename : "photos/noimg.jpg";

  // DB 업데이트 실행
  $update = $pdo->prepare("UPDATE students SET photo_path = ? WHERE id = ?");
  $update->execute([$pathToSave, $stu['id']]);
}

echo "✅ 사진 경로 자동 업데이트 완료!";
?>
