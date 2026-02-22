<?php
header("Content-Type: application/json; charset=UTF-8");
require_once("db.php");

$grade = isset($_GET['grade']) ? intval($_GET['grade']) : 0;
$class = isset($_GET['class']) ? intval($_GET['class']) : 0;

$sql = "SELECT name, grade, class, photo_path AS photo_filename FROM students WHERE 1"; // photo_path를 photo_filename으로 변경

if ($grade > 0) {
  $sql .= " AND grade = $grade";
}
if ($class > 0) {
  $sql .= " AND class = $class";
}
$sql .= " ORDER BY RAND() LIMIT 4";

$result = $conn->query($sql);
$students = [];

while ($row = $result->fetch_assoc()) {
  // 학년과 반 정보를 사용하여 디렉토리 경로를 구성
  // 예: student/25/photos/1-1/
  $directory_path = "student/25/photos/" . $row['grade'] . "-" . $row['class'] . "/";
// photo_filename에서 확장자(.jpg)를 제외한 순수 파일명을 추출합니다.
$filename_without_extension = pathinfo($row['photo_filename'], PATHINFO_FILENAME);
// 학번 두 자리를 조합합니다. (여기서는 grade와 class를 조합하여 임시 학번 생성 - 실제 학번 데이터가 있다면 해당 컬럼 사용)
$student_id = sprintf("%02d", $row['grade']) . sprintf("%02d", $row['class']);
// 새로운 파일명을 구성합니다.
$new_filename = $student_id . $filename_without_extension . "." . pathinfo($row['photo_filename'], PATHINFO_EXTENSION);
$full_photo_path = $directory_path . $new_filename;
  $row['photo'] = urlencode($full_photo_path); // 'photo_filename' 대신 'photo'로 키 변경
  
  // 불필요한 photo_filename 키는 제거하거나 유지할 수 있습니다.
  unset($row['photo_filename']); 
  
  $students[] = $row;
}

echo json_encode($students, JSON_UNESCAPED_UNICODE);
?>