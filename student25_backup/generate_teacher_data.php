<?php
// DB 연결
$host = "localhost";
$user = "root";
$pass = "";
$dbname = "teacher25_db";  // DB 이름
$conn = new mysqli($host, $user, $pass, $dbname);
$conn->set_charset("utf8");

// 연결 오류 확인
if ($conn->connect_error) {
    die("❌ DB 연결 실패: " . $conn->connect_error);
}

// 🔹 이 부분에 SQL 넣기!
$sql = "SELECT `담임학년`, `담임반`, `이름`, `핸드폰`, `기타1`, `기타2` FROM teacher25 
        WHERE `담임학년` IS NOT NULL AND `담임반` IS NOT NULL";

$result = $conn->query($sql);

$classInfo = [];

while ($row = $result->fetch_assoc()) {
    $classInfo[] = [
        "grade" => (int)$row["담임학년"],
        "class" => (int)$row["담임반"],
        "homeroom" => $row["이름"],
        "homeroomPhone" => $row["핸드폰"],
        "sub" => $row["기타1"],
        "subPhone" => $row["기타2"]
    ];
}

// JS 파일로 저장
$js = "const classInfo = " . json_encode($classInfo, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . ";";
file_put_contents("teacher-data.js", $js);

echo "✅ teacher-data.js 파일 생성 완료";
?>
