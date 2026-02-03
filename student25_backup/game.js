// game.js

// game.js

let correctName = "";

function loadStudent() {
  fetch("get-random-student.php")
    .then(res => res.json())
    .then(data => {
      console.log("불러온 학생:", data);

      if (!Array.isArray(data) || data.length < 4) {
        throw new Error("학생 데이터가 부족하거나 잘못됨");
      }

      const correct = data[Math.floor(Math.random() * 4)];
      correctName = correct.name;

      // 변경: 이미 PHP에서 URL 인코딩되었으므로, JavaScript에서는 인코딩하지 않고 직접 사용합니다.
      const photoPath = correct.photo; 

      document.getElementById("student-photo").src = photoPath;
      document.getElementById("overlay-name").style.display = "none";
      document.getElementById("highlight-circle").style.display = "none";

      const options = shuffleArray(data.map(s => s.name));
      const optionsDiv = document.querySelector(".options");
      optionsDiv.innerHTML = "";

      options.forEach(name => {
        const btn = document.createElement("button");
        btn.textContent = name;
        btn.addEventListener("click", handleAnswer);
        optionsDiv.appendChild(btn);
      });
    })
    .catch(err => {
      console.error("학생 불러오기 실패:", err);
      document.getElementById("game-container").textContent = "오류 발생!";
    });
}


function handleAnswer(e) {
  const selectedName = e.target.textContent;
  document.querySelectorAll(".options button").forEach(btn => {
    btn.disabled = true;
  });

  if (selectedName === correctName) {
    e.target.classList.add("correct");
    document.getElementById("highlight-circle").style.display = "block";
    document.getElementById("overlay-name").style.display = "none";
    setTimeout(() => loadStudent(), 1200);
  } else {
    e.target.classList.add("wrong");
    const correctBtn = [...document.querySelectorAll(".options button")] 
      .find(btn => btn.textContent === correctName);
    if (correctBtn) correctBtn.classList.add("correct");

    const overlay = document.getElementById("overlay-name");
    overlay.style.fontSize = "32px";
    overlay.textContent = correctName;
    overlay.style.display = "block";

    setTimeout(() => {
      overlay.style.display = "none";
      loadStudent();
    }, 2000);
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

document.addEventListener("DOMContentLoaded", () => {
  loadStudent();
});