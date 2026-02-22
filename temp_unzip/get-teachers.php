<?php
ini_set('display_errors', 1); // ⚠ 개발 중 에러 확인용 (배포 시 꺼야 함)
error_reporting(E_ALL);

header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "", "teacher25_db");
$conn->set_charset("utf8");

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB 연결 실패"]);
    exit;
}

// 담임 교사 전부 조회
$result = $conn->query("SELECT * FROM teacher25 WHERE grade IS NOT NULL AND class IS NOT NULL");
if (!$result) {
    http_response_code(500);
    echo json_encode(["error" => "담임 교사 조회 실패: " . $conn->error]);
    exit;
}

$data = [];

while ($row = $result->fetch_assoc()) {
    $grade = intval($row['grade']);
    $class = intval($row['class']);

    // 해당 학급의 부담임을 찾는다
    $subQuery = "
        SELECT name, phone FROM teacher25
        WHERE sub_grade = $grade AND sub_class = $class
        LIMIT 1
    ";
    $subResult = $conn->query($subQuery);
    $sub = ($subResult && $subResult->num_rows > 0) ? $subResult->fetch_assoc() : null;

    $data[] = [
        "grade" => $grade,
        "class" => $class,
        "homeroom" => $row['name'],
        "homeroomPhone" => $row['phone'],
        "sub" => $sub['name'] ?? "",
        "subPhone" => $sub['phone'] ?? ""
    ];
}

echo json_encode($data, JSON_UNESCAPED_UNICODE);
$conn->close();
?>
