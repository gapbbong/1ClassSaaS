<?php
require_once(__DIR__ . "/../config.php");
require_once(__DIR__ . "/../db.php"); // 이 파일은 mysqli 방식의 $conn을 제공합니다

header("Content-Type: application/json; charset=UTF-8");

try {
    $sql = "SELECT * FROM students LIMIT 1"; // ✅ 한 줄만 테스트용
    $result = $conn->query($sql);
    $students = [];

    while ($row = $result->fetch_assoc()) {
        $students[] = $row;
    }

    echo json_encode($students, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
