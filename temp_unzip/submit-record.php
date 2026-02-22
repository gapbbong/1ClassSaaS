<?php
// ✅ DB 연결 (한 번만)
$conn = new mysqli("localhost", "root", "", "students25_db");
$conn->set_charset("utf8");

if ($conn->connect_error) {
  die("DB 연결 실패: " . $conn->connect_error);
}

// ✅ POST 데이터 수신
$student_id = $_POST['student_id'] ?? '';
$name       = $_POST['name'] ?? '';
$good       = $_POST['good'] ?? '';
$bad        = $_POST['bad'] ?? '';
$teacher    = $_POST['teacher'] ?? '';
$detail     = $_POST['detail'] ?? '';

// ✅ 유효성 검사
if (!$student_id || !$name) {
    echo json_encode([
        "success" => false,
        "message" => "학번과 이름은 필수입니다."
    ]);
    exit;
}

// ✅ DB 저장
$stmt = $conn->prepare("
    INSERT INTO records (student_id, name, good, bad, teacher, detail)
    VALUES (?, ?, ?, ?, ?, ?)
");
$stmt->bind_param("ssssss", $student_id, $name, $good, $bad, $teacher, $detail);
$success = $stmt->execute();

if ($success) {
    echo json_encode([
        "success" => true,
        "message" => "기록이 저장되었습니다."
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "저장 실패: " . $stmt->error
    ]);
}

$conn->close();
?>
