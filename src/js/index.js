import { classInfo } from './teacher-data.js';
import { isLightColor } from './utils.js';
import { fetchClassStats } from './api.js';

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("class-list");
  container.innerHTML = "";
  container.classList.add("loading-records");

  // 1. [최적화] 먼저 기본 레이아웃을 즉시 그립니다.
  renderInitialGrid(container);

  const pageTitle = document.querySelector(".page-title");
  if (pageTitle) {
    pageTitle.innerHTML = `기록 <span class="loading-dots">불러오는 중</span>`;
  }

  try {
    // 2. [최적화] 경량화된 통계 데이터만 비동기로 가져옵니다.
    const stats = await fetchClassStats();

    // 3. 상단 총 건수 업데이트
    const pageTitle = document.querySelector(".page-title");
    if (pageTitle) {
      pageTitle.innerHTML = `기록 <a href="total-records.html" class="title-link">${stats.grandTotal}건</a>`;
    }

    // 4. 각 반 박스의 배지 업데이트
    updateClassBadges(stats.classStats);

    container.classList.remove("loading-records");

  } catch (error) {
    console.error("Index load error:", error);
    container.classList.remove("loading-records");
    // 에러가 나도 화면은 이미 그려져 있으므로 배지만 안 나올 것입니다.
  }
});

function renderInitialGrid(container) {
  container.innerHTML = "";

  for (let grade = 1; grade <= 3; grade++) {
    const col = document.createElement("div");
    col.className = "grade-column";

    for (let classNum = 1; classNum <= 6; classNum++) {
      const box = document.createElement("div");
      box.className = "class-box";

      const info = classInfo.find(c => c.grade === grade && c.class === classNum);
      if (info) {
        // 배경색 결정
        let hue = grade === 1 ? 150 : (grade === 2 ? 210 : 30);
        let light = 90 - (classNum * 12);
        const bgColor = `hsl(${hue}, 60%, ${light}%)`;

        box.innerHTML = `
                    <section class="class-section" style="background-color: ${bgColor}; ${light < 55 ? 'color: #fff;' : ''}">
                        <h3 class="class-title" style="${light < 55 ? 'color: #fff;' : ''}">
                            <a class="class-button" href="stu-list.html?grade=${info.grade}&class=${info.class}" 
                               style="background-color: ${bgColor}; color: ${isLightColor(bgColor) ? '#000' : '#fff'}">
                                ${info.grade}-${info.class}반
                            </a>
                            <span id="badge-${grade}-${classNum}" class="badge-placeholder"></span>
                        </h3>
                        <div class="teacher-line">
                            <div>        
                                <a href="tel:${info.homeroomPhone}" style="color: ${light < 55 ? '#fff' : '#FF0000'};">📞</a>
                                ${info.homeroom}
                                <a href="sms:${info.homeroomPhone}" style="color: ${light < 55 ? '#fff' : '#00FF00'};">💬</a>
                            </div>
                            <div>
                                <a href="tel:${info.subPhone}" style="color: ${light < 55 ? '#fff' : '#FF0000'};">📞</a>
                                <span>${info.sub}</span>
                                <a href="sms:${info.subPhone}" style="color: ${light < 55 ? '#fff' : '#00FF00'};">💬</a>
                            </div>
                        </div>
                    </section>
                `;
      }
      col.appendChild(box);
    }
    container.appendChild(col);
  }
}

function updateClassBadges(classStats) {
  Object.keys(classStats).forEach(key => {
    const badgeEl = document.getElementById(`badge-${key}`);
    const count = classStats[key];
    if (badgeEl && count > 0) {
      const [grade, classNum] = key.split("-");
      badgeEl.innerHTML = `<a href="total-records.html?grade=${grade}&class=${classNum}" class="count-badge-link"><span class="count-badge">(${count}건)</span></a>`;
    }
  });
}

