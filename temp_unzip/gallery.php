<?php
$dir = __DIR__ . '/photos/1-1';
$files = array_filter(scandir($dir), function($f) {
  return preg_match('/\.jpg$/i', $f);
});
?>

<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>1-1반 전체 사진</title>
  <style>
    body {
      font-family: sans-serif;
      background-color: #f0f0f0;
      padding: 20px;
      text-align: center;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 20px;
      justify-items: center;
    }
    .student img {
      width: 120px;
      border-radius: 10px;
      box-shadow: 2px 2px 6px rgba(0,0,0,0.2);
    }
    .student-name {
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <h2>1-1반 전체 학생</h2>
  <div class="grid">
    <?php foreach ($files as $file): ?>
      <?php
$filename = pathinfo($file, PATHINFO_FILENAME);
$num = mb_substr($filename, 0, 2);      // 학번 두 자리
$name = mb_substr($filename, 2);        // 이름 부분
?>
<div class="student-name"><?= $num . ' ' . $name ?></div>

        <img src="photos/1-1/<?= $file ?>" alt="<?= $name ?>" onerror="this.src='photos/noimg.jpg'">
        <div class="student-name"><?= $name ?></div>
      </div>
    <?php endforeach; ?>
  </div>
</body>
</html>
