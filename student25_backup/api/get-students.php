<?php
// DB 연결 정보
$host = 'localhost';
$user = 'root';
$pass = '';
$db = 'students25_db';

header('Content-Type: application/json; charset=utf-8');

$conn = new mysqli($host, $user, $pass, $db);
$conn->set_charset("utf8mb4");

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'DB 연결 실패']);
    exit;
}

$sql = "SELECT
    grade,
    class,
    student_id,
    name,
    phone AS student_phone,    -- 'phone'을 'student_phone'으로 별칭
    father_phone,
    mother_phone,
    address,
  gender,     -- ✅ 반드시 포함
  status      -- ✅ 반드시 포함
    middle_school,             -- 'middle_school' 컬럼 추가
    photo_path AS photo_url    -- 'photo_path'를 'photo_url'로 별칭
FROM students";

$result = $conn->query($sql);
if (!$result) {
    http_response_code(500);
    echo json_encode(['error' => '쿼리 실패: ' . $conn->error]); // 쿼리 오류 메시지 추가
    exit;
}

$students = [];
while ($row = $result->fetch_assoc()) {
    $students[] = $row; // 연관 배열을 그대로 사용
}

echo json_encode($students, JSON_UNESCAPED_UNICODE);
$conn->close();
?>