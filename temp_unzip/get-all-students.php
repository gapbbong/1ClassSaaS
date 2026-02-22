<?php
header('Content-Type: application/json');

// DB 연결
$conn = new mysqli("localhost", "root", "", "students25_db");
$conn->set_charset("utf8");

// 연결 확인
if ($conn->connect_error) {
    die(json_encode(["error" => "DB 연결 실패: " . $conn->connect_error]));
}

// students 테이블 전체 조회
$sql = "SELECT * FROM students";
$result = $conn->query($sql);

$students = [];
while ($row = $result->fetch_assoc()) {
    $students[] = $row;
}

// JSON 출력
echo json_encode($students, JSON_UNESCAPED_UNICODE);
$conn->close();
?>
