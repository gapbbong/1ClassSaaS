<?php
header("Content-Type: application/json; charset=UTF-8");


// ✅ DB 연결
$conn = new mysqli("localhost", "root", "", "students25_db");
$conn->set_charset("utf8mb4");

if ($conn->connect_error) {
  die("DB 연결 실패: " . $conn->connect_error);
}

// ✅ 항목 가져오기
$sql = "SELECT item FROM good_items";
$result = $conn->query($sql);

$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row['item'];
}

// ✅ JSON 출력
echo json_encode(["good" => $items], JSON_UNESCAPED_UNICODE);

$conn->close();
?>
