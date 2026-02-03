<?php
header("Content-Type: application/json; charset=utf-8");
require_once("config.php");

// ✅ 범위 필터 함수
function getFilterCondition($range) {
    if ($range === "전교생") return "1=1";

    if (preg_match("/(\d)학년 전체/", $range, $m)) {
        return "grade = " . $m[1];
    }

    if (preg_match("/(\d)학년 (전기과|전자과)/", $range, $m)) {
        $grade = $m[1];
        $classCond = $m[2] === "전기과" ? "class <= 3" : "class >= 4";
        return "grade = $grade AND $classCond";
    }

    if (preg_match("/(\d)학년 (\d)반/", $range, $m)) {
        return "grade = {$m[1]} AND class = {$m[2]}";
    }

    return "1=1";
}

try {
    $pdo = new PDO(DB_DSN, DB_USER, DB_PASSWORD);
    $pdo->exec("SET NAMES utf8mb4");

    $range = $_GET['range'] ?? "전교생";
    $condition = getFilterCondition($range);

    // ✅ 선택 범위 전체 학생 불러오기
    $stmt = $pdo->query("SELECT name, photo_path FROM students WHERE $condition AND photo_path IS NOT NULL");
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($students) === 0) {
        echo json_encode(["error" => "해당 범위에 학생이 없습니다."]);
        exit;
    }

    $result = [];

    foreach ($students as $student) {
        $correctName = $student['name'];
        $photoPath = $student['photo_path'];

        // 오답 후보 3명
        $stmt2 = $pdo->prepare("SELECT name FROM students WHERE $condition AND name != :name AND photo_path IS NOT NULL ORDER BY RAND() LIMIT 3");
        $stmt2->execute([':name' => $correctName]);
        $incorrects = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        $options = $incorrects;
        $options[] = ['name' => $correctName];
        shuffle($options);

        $result[] = [
            'name' => $correctName,
            'photo_path' => $photoPath,
            'choices' => array_map(fn($opt) => $opt['name'], $options)
        ];
    }

    // ✅ 문제 순서 섞기
    shuffle($result);

    echo json_encode($result, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode(['error' => 'DB 오류: ' . $e->getMessage()]);
}
?>
