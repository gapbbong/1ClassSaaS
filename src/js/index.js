import { classInfo } from './teacher-data.js';
import { isLightColor } from './utils.js';
import { fetchAllStudents } from './api.js';

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("class-list");
  container.innerHTML = "";
  container.classList.add("loading-records");

  try {
    // 1. 전체 학생 데이터 가져오기 (기록 건수 포함됨)
    const allStudents = await fetchAllStudents();

    // 2. 전체 기록 건수 및 학급별 합산 계산
    const grandTotalRecords = allStudents.reduce((acc, s) => acc + (parseInt(s.recordCount) || 0), 0);
    const classStats = {};
    allStudents.forEach(s => {
      const key = `${s["학년"]}-${s["반"]}`;
      const count = parseInt(s.recordCount || 0);
      classStats[key] = (classStats[key] || 0) + count;
    });

    const pageTitle = document.querySelector(".page-title");
    if (pageTitle) {
      pageTitle.innerHTML = `기록 <a href="total-records.html" class="title-link">${grandTotalRecords}건</a>`;
    }

    container.classList.remove("loading-records");
    container.innerHTML = ""; // 초기화

    // 1학년부터 3학년까지 반복
    for (let grade = 1; grade <= 3; grade++) {
      const col = document.createElement("div");
      col.className = "grade-column";

      // 각 학년의 1반부터 6반까지 반복
      for (let classNum = 1; classNum <= 6; classNum++) {
        const box = document.createElement("div");
        box.className = "class-box";

        const info = classInfo.find(c => c.grade === grade && c.class === classNum);

        if (info) {
          const key = `${grade}-${classNum}`;
          const totalRecords = classStats[key] || 0;

          // 배경색 결정
          let hue = 0;
          let sat = 60;
          let light = 90 - (classNum * 12);

          if (grade === 1) hue = 150;
          else if (grade === 2) hue = 210;
          else hue = 30;

          const bgColor = `hsl(${hue}, ${sat}%, ${light}%)`;

          box.innerHTML = `
            <section class="class-section">
            <h3 class="class-title"><a class="class-button" href="stu-list.html?grade=${info.grade}&class=${info.class}">${info.grade}-${info.class}반</a>${totalRecords > 0 ? `<a href="total-records.html?grade=${info.grade}&class=${info.class}" class="count-badge-link"><span class="count-badge">(${totalRecords}건)</span></a>` : ''}</h3>
            <div class="teacher-line">
                <div>        
                  <a href="tel:${info.homeroomPhone}" style="color: #FF0000;">📞</a>
                  ${info.homeroom}
                  <a href="sms:${info.homeroomPhone}" style="color: #00FF00;">💬</a>
                </div>
                <div>
                  <a href="tel:${info.subPhone}" style="color: #FF0000;">📞</a>
                  <span class="sub-label"> </span>${info.sub}
                  <a href="sms:${info.subPhone}" style="color: #00FF00;">💬</a>
                </div>
              </div>
            </section>
          `;

          const section = box.querySelector(".class-section");
          if (section) {
            section.style.backgroundColor = bgColor;
            if (light < 55) {
              section.style.color = "#fff";
              const links = section.querySelectorAll("a");
              links.forEach(a => a.style.color = "#fff");
              const title = section.querySelector(".class-title");
              if (title) title.style.color = "#fff";
            }
          }

          const button = box.querySelector(".class-button");
          if (button) {
            button.style.backgroundColor = bgColor;
            button.style.color = isLightColor(bgColor) ? '#000' : '#fff';
          }
        }
        col.appendChild(box);
      }
      container.appendChild(col);
    }
  } catch (error) {
    console.error("Index load error:", error);
    container.classList.remove("loading-records");
    container.innerHTML = `<div class="error-message">데이터 로딩 실패 😭</div>`;
  }
});
