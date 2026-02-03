<?php
require_once 'config.php';

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT name, photo_path FROM students WHERE photo_path IS NOT NULL AND photo_path != '' ORDER BY RAND() LIMIT 1";
$result = $conn->query($sql);

if ($result && $row = $result->fetch_assoc()) {
    echo json_encode([
        "name" => $row["name"],
        "photo_path" => $row["photo_path"]
    ]);
} else {
    echo json_encode(["error" => "학생 정보를 찾을 수 없습니다."]);
}

$conn->close();
?>
