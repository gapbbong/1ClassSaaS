<?php
$mysqli = new mysqli("localhost", "root", "", "students25_db");
if ($mysqli->connect_errno) {
  die("MySQL 연결 실패: " . $mysqli->connect_error);
}

$baseDir = __DIR__ . "/photos";
$updated = 0;

foreach (scandir($baseDir) as $folder) {
  if ($folder === '.' || $folder === '..') continue;

  $subDir = $baseDir . "/" . $folder;
  if (!is_dir($subDir)) continue;

  list($grade, $class) = explode("-", $folder);

  foreach (scandir($subDir) as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) !== "jpg") continue;

    // 예: 01홍길동.jpg → 이름 추출
    $filenameOnly = pathinfo($file, PATHINFO_FILENAME); // 01홍길동
    $name = mb_substr($filenameOnly, 2); // 앞의 두 자리(번호) 제외

    // UPDATE 실행
    $stmt = $mysqli->prepare("UPDATE students SET filename = ? WHERE grade = ? AND class = ? AND name = ?");
    $stmt->bind_param("siis", $file, $grade, $class, $name);
    $stmt->execute();

    if ($stmt->affected_rows > 0) $updated++;
  }
}

echo "✅ 업데이트 완료: $updated 개 파일명이 적용됨.";
