<?php
header("Content-Type: application/json; charset=utf-8");
require_once("config.php");

function findActualPhotoPath($path) {
  $baseDir = __DIR__ . "/photos/";
  $fullDir = $baseDir . dirname($path);
  $filename = basename($path);

  if (!is_dir($fullDir)) return null;

  $files = scandir($fullDir);
  foreach ($files as $file) {
    // 앞에 두 자리 숫자 + 이름이 일치하는 파일 찾기 (예: 01강서안.jpg)
    if (preg_match('/^\d{2}' . preg_quote($filename, '/') . '$/u', $file)) {
      return dirname($path) . "/" . $file;
    }
  }
  return null;
}

try {
  $pdo = new PDO(DB_DSN, DB_USER, DB_PASSWORD);
  $pdo->exec("SET NAMES utf8mb4");

  $stmt = $pdo->query("SELECT name, photo_path FROM students WHERE photo_path IS NOT NULL ORDER BY RAND() LIMIT 1");
  $student = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$student) {
    echo json_encode(["error" => "학생 정보를 찾을 수 없습니다."]);
    exit;
  }

  $actualPath = findActualPhotoPath($student["photo_path"]);
  if (!$actualPath) {
    echo json_encode(["error" => "🚨 오류: 실제 사진 파일을 찾을 수 없습니다."]);
    exit;
  }

  echo json_encode([
    "name" => $student["name"],
    "photo_path" => $actualPath
  ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
  echo json_encode(["error" => "DB 오류: " . $e->getMessage()]);
}
