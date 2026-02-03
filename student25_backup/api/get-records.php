<?php
// JSON 응답
header('Content-Type: application/json; charset=UTF-8');

try {
    // DB 연결 설정
    $pdo = new PDO("mysql:host=localhost;dbname=students25_db;charset=utf8", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // GET 파라미터 (학년과 반을 받도록 변경)
    $grade = isset($_GET['grade']) ? trim($_GET['grade']) : '';
    $class = isset($_GET['class']) ? trim($_GET['class']) : '';

    // 필수 값 확인 (학년과 반이 비어있으면 빈 배열 반환)
    if ($grade === '' || $class === '') {
        echo json_encode([]);
        exit;
    }

    // student_id가 '학년' + '반'으로 시작하는 모든 레코드를 조회
    // 예: grade='2', class='1' 이면 student_id가 '21%'인 모든 레코드
    $prefix = $grade . $class;
    $stmt = $pdo->prepare("SELECT * FROM records WHERE student_id LIKE ? ORDER BY time DESC");
    $stmt->execute([$prefix . '%']); // '%'를 사용하여 LIKE 검색

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // JSON 출력
    echo json_encode($rows, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500); // 서버 오류 응답
    echo json_encode(["error" => $e->getMessage()]);
}
?>