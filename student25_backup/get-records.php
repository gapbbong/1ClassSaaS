<?php
header("Content-Type: application/json; charset=UTF-8");

$conn = new mysqli("localhost", "root", "", "students25_db");
$conn->set_charset("utf8mb4");

if ($conn->connect_error) {
    die(json_encode(["error" => "DB 연결 실패: " . $conn->connect_error]));
}

$student_id = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;

$sql = "SELECT id, student_id, name, good, bad, teacher, time, detail 
        FROM records 
        WHERE student_id = $student_id 
        ORDER BY time DESC";

$result = $conn->query($sql);

$data = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
}

echo json_encode($data, JSON_UNESCAPED_UNICODE);
$conn->close();
?>
