<?php
header("Content-Type: application/json");
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once "db.php";

$sql = "SELECT photo_path, name FROM students ORDER BY RAND() LIMIT 1";
$result = $conn->query($sql);

if ($result && $row = $result->fetch_assoc()) {
    echo json_encode($row, JSON_UNESCAPED_UNICODE); // ← 여기에 옵션 추가!
} else {
    echo json_encode(["error" => "학생을 불러올 수 없습니다."], JSON_UNESCAPED_UNICODE);
}
$conn->close();
?>
