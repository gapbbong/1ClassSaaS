// summary-table.js
window.API_URL = window.API_URL || "api/get-students-summary.php";


window.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("summaryTable");
  container.innerHTML = "📊 통계 로딩 중...";

  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    const gradeDeptStats = {
      1: { "IoT전기과": { 남: 0, 여: 0, 합계: 0, 위탁: 0 }, "게임콘텐츠과": { 남: 0, 여: 0, 합계: 0, 위탁: 0 } },
      2: { "IoT전기과": { 남: 0, 여: 0, 합계: 0, 위탁: 0 }, "전자제어과": { 남: 0, 여: 0, 합계: 0, 위탁: 0 } },
      3: { "IoT전기과": { 남: 0, 여: 0, 합계: 0, 위탁: 0 }, "전자제어과": { 남: 0, 여: 0, 합계: 0, 위탁: 0 } },
    };

    const classStats = {}; // 반별 통계용

    data.forEach(s => {
      const grade = parseInt(s.grade);
      const cls = parseInt(s.class);
      const gender = s.gender?.trim();
      const rawStatus = s.status;
      const status = String(rawStatus ?? '').trim();

      if (grade === 0 && cls === 0) return;
      if (status === "자퇴" || status === "전출") return;

      const key = `${grade}-${cls}`;
      if (!classStats[key]) classStats[key] = { 남: 0, 여: 0, 합계: 0, 위탁: 0 };

      classStats[key].합계++;
      if (status === "위탁") classStats[key].위탁++;
      if (gender === "남") classStats[key].남++;
      else if (gender === "여") classStats[key].여++;

      let dept = "";
      if ([1, 2, 3].includes(cls)) dept = "IoT전기과";
      else if ([4, 5, 6].includes(cls)) {
        dept = grade === 1 ? "게임콘텐츠과" : "전자제어과";
      } else {
        return;
      }

      if (!gradeDeptStats[grade] || !gradeDeptStats[grade][dept]) return;

      gradeDeptStats[grade][dept].합계++;
      if (status === "위탁") gradeDeptStats[grade][dept].위탁++;
      if (gender === "남") gradeDeptStats[grade][dept].남++;
      else if (gender === "여") gradeDeptStats[grade][dept].여++;
    });

    let html = "";
    html += `
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin: auto auto 30px; font-size: 18px;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th>학년</th><th>학과</th><th>남</th><th>여</th><th>합계</th><th>위탁</th>
          </tr>
        </thead>
        <tbody>`;

    for (const grade of [1, 2, 3]) {
      let totalNam = 0, totalYeo = 0, totalSum = 0, totalWitak = 0;
      const depts = Object.entries(gradeDeptStats[grade]);
      depts.forEach(([dept, stats], i) => {
        html += `<tr>`;
        if (i === 0) {
          html += `<td rowspan="${depts.length + 1}">${grade}</td>`;
        }
        html += `<td>${dept}</td>
          <td>${stats.남}</td>
          <td>${stats.여}</td>
          <td>${stats.합계}</td>
          <td>${stats.위탁}</td>
        </tr>`;
        totalNam += stats.남;
        totalYeo += stats.여;
        totalSum += stats.합계;
        totalWitak += stats.위탁;
      });
      html += `<tr style="background: #ffffcc; font-weight: bold;">
        <td>합계</td><td>${totalNam}</td><td>${totalYeo}</td><td>${totalSum}</td><td>${totalWitak}</td>
      </tr>`;
    }
    html += `</tbody></table>`;

    html += `<h3>학년-반별 인원 현황</h3>`;
    html += `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin: auto; font-size: 18px;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th>반</th><th>남</th><th>여</th><th>합계</th><th>위탁</th>
        </tr>
      </thead>
      <tbody>
    `;

    let final = { 남: 0, 여: 0, 합계: 0, 위탁: 0 };
    for (let grade = 1; grade <= 3; grade++) {
      for (let cls = 1; cls <= 6; cls++) {
        const key = `${grade}-${cls}`;
        const s = classStats[key];
        if (s) {
          html += `<tr><td>${key}</td><td>${s.남}</td><td>${s.여}</td><td>${s.합계}</td><td>${s.위탁}</td></tr>`;
          final.남 += s.남;
          final.여 += s.여;
          final.합계 += s.합계;
          final.위탁 += s.위탁;
        }
      }
    }

    html += `<tr style="background: #ffffcc; font-weight: bold;"><td>전교생</td><td>${final.남}</td><td>${final.여}</td><td>${final.합계}</td><td>${final.위탁}</td></tr>`;

    html += `</tbody></table>`;

    container.innerHTML = html;
  } catch (err) {
    console.error("통계 오류:", err);
    container.innerHTML = "⚠️ 통계를 불러오는 중 오류 발생";
  }
});
