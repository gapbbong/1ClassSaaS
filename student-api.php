<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
$conn = new mysqli("localhost", "root", "", "students25_db"); // ✅ 올바른 DB 이름

$conn->set_charset("utf8");

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB 연결 실패"]);
    exit;
}

$grade = $_GET['grade'] ?? null;
$class = $_GET['class'] ?? null;

if (!$grade || !$class) {
    http_response_code(400);
    echo json_encode(["error" => "학년/반 누락"]);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM students WHERE grade = ? AND class = ?");

$stmt->bind_param("ii", $grade, $class);
$stmt->execute();
$result = $stmt->get_result();

$students = [];
while ($row = $result->fetch_assoc()) {
    $students[] = $row;
}

echo json_encode($students, JSON_UNESCAPED_UNICODE);
$stmt->close();
$conn->close();
?>
