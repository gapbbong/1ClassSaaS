<?php
$conn = new mysqli("localhost", "root", "", "students25_db");

// 연결 오류 확인
if ($conn->connect_error) {
  die("연결 실패: " . $conn->connect_error);
}

// ✅ 문자셋을 UTF-8로 설정 (한글 깨짐 방지)
$conn->set_charset("utf8mb4");
?>
