
// ✅ update-photo-paths.php (파일 경로 자동 등록 + 정제 기능 포함)
<?php
require_once("config.php");
$dir = __DIR__ . "/photos";

function clean_filename($filename) {
    return preg_replace('/[#?？]/u', '', $filename);
}

try {
    $pdo = new PDO(DB_DSN, DB_USER, DB_PASSWORD);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("UPDATE students SET photo_path = NULL");

    $rii = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));

    foreach ($rii as $file) {
        if ($file->isDir()) continue;
        $path = $file->getPathname();

        $relativePath = str_replace(__DIR__ . '/', '', $path);
        $cleaned = clean_filename($relativePath);

        // 이름 추출 (예: 01홍길동.jpg → 홍길동)
        if (preg_match("/\\/([^\\/]+)\\.jpg$/u", $cleaned, $matches)) {
            $filename = $matches[1];
            $name = preg_replace('/^[0-9]+/', '', $filename);

            $stmt = $pdo->prepare("UPDATE students SET photo_path = :path WHERE name = :name");
            $stmt->execute([
                ':path' => $cleaned,
                ':name' => $name
            ]);
        }
    }
    echo "<p style='color:green;'>✅ 사진 경로 자동 업데이트 완료!</p>";

} catch (PDOException $e) {
    echo "<p style='color:red;'>❌ 오류: ".$e->getMessage()."</p>";
}
?>

