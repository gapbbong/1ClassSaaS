import { fetchAllStudents } from './api.js';
import { extractDriveId, getThumbnailUrl } from './utils.js';

document.addEventListener("DOMContentLoaded", () => {
    const summaryBox = document.getElementById("summary");
    const resultBox = document.getElementById("results");
    const countBox = document.getElementById("result-count");
    const searchForm = document.getElementById("searchForm");

    // 초기 로드: 통계 표시
    if (summaryBox) {
        summaryBox.innerHTML = `<div class="loader"></div><p>통계 불러오는 중...</p>`;
        loadAllDataForSummary();
    }

    // 검색 이벤트
    if (searchForm) {
        searchForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const category = document.getElementById("category").value;
            const keyword = document.getElementById("keyword").value.trim();

            resultBox.innerHTML = `<div class="loader"></div><p>검색 중...</p>`;
            countBox.innerHTML = "";
            // 검색 시 통계는 숨기거나 초기화? 원본 코드는 summaryBox.innerHTML = "" 로 숨김
            summaryBox.innerHTML = "";

            try {
                const data = await fetchAllStudents();
                const results = data.filter(student => {
                    if (category === "학생폰") {
                        return (
                            (student["학생폰"] && student["학생폰"].includes(keyword)) ||
                            (student["부(연락처)"] && student["부(연락처)"].includes(keyword)) ||
                            (student["모(연락처)"] && student["모(연락처)"].includes(keyword))
                        );
                    } else {
                        const target = student[category];
                        return target && target.toString().includes(keyword);
                    }
                });

                renderResults(results);
                loadSummaryTable(results); // 검색 결과에 대한 통계? 원본은 검색 시에는 통계 안 보여주는 듯 했으나 코드상 loadSummaryTable(results) 호출함.

            } catch (error) {
                console.error("Search Error:", error);
                resultBox.innerHTML = "⚠️ 검색 중 오류가 발생했습니다.";
            }
        });
    }
});

async function loadAllDataForSummary() {
    const summaryBox = document.getElementById("summary");
    try {
        const data = await fetchAllStudents();
        console.log("Student Data Sample:", data[0]); // 데이터 구조 확인
        // 만약 여기에 'recoardCount' 같은 게 있다면 대박!
        loadSummaryTable(data);
    } catch (error) {
        console.error("Summary Load Error:", error);
        summaryBox.innerHTML = "⚠️ 통계 데이터를 불러오지 못했습니다.";
    }
}

function loadSummaryTable(data) {
    const summaryBox = document.getElementById("summary");
    if (!summaryBox) return;

    const summary = {};

    data.forEach(s => {
        let grade = parseInt(s["학년"]);
        const cls = parseInt(s["반"]);

        // [수정] 학년이 2025 등 연도로 표시된 경우 학번의 첫 자리를 학년으로 사용
        if (grade > 10 && s["학번"]) {
            const sNum = String(s["학번"]);
            grade = parseInt(sNum[0]) || grade;
        }

        const gender = s["성별"];
        const status = String(s["학적"] || "").trim();

        if (!grade || !cls || isNaN(grade) || isNaN(cls)) return;
        if (status.includes("자퇴") || status.includes("전출")) return;

        let major = "미지정";
        if ([1, 2, 3].includes(cls)) major = "IoT전기과";
        else if (grade === 1 && [4, 5, 6].includes(cls)) major = "게임콘텐츠과";
        else if (grade >= 2 && [4, 5, 6].includes(cls)) major = "전자제어과";

        const key = `${grade}-${major}`;
        if (!summary[key]) summary[key] = { grade, major, 남: 0, 여: 0, 위탁: 0 };

        if (gender === "남" || gender === "남자") summary[key].남++;
        else if (gender === "여" || gender === "여자") summary[key].여++;

        if (status.includes("위탁")) summary[key].위탁++;
    });

    const deptOrder = ["IoT전기과", "게임콘텐츠과", "전자제어과"];
    const sorted = Object.values(summary).sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return deptOrder.indexOf(a.major) - deptOrder.indexOf(b.major);
    });

    const grouped = {};
    sorted.forEach(row => {
        const g = row.grade;
        if (!grouped[g]) grouped[g] = [];
        grouped[g].push(row);
    });

    let html = `
    <table class="summary-table">
      <tr><th>학년/학과</th><th>남</th><th>여</th><th>위탁</th><th>과별합</th></tr>
  `;

    let totalM = 0, totalF = 0, totalW = 0;

    for (const grade in grouped) {
        const rows = grouped[grade];
        let subM = 0, subF = 0, subW = 0;

        rows.forEach(r => {
            const sum = r.남 + r.여 + r.위탁;
            subM += r.남;
            subF += r.여;
            subW += r.위탁;
            html += `<tr>
        <td>${r.grade}학년 ${r.major}</td>
        <td>${r.남}</td>
        <td>${r.여}</td>
        <td>${r.위탁}</td>
        <td>${sum}</td>
      </tr>`;
        });

        const subTotal = subM + subF + subW;
        html += `<tr class="subtotal">
      <td><b>${grade}학년 성별합계</b></td>
      <td><b>${subM}</b></td>
      <td><b>${subF}</b></td>
      <td><b>${subW}</b></td>
      <td><b>${subTotal}</b></td>
    </tr>`;

        totalM += subM;
        totalF += subF;
        totalW += subW;
    }

    const grandTotal = totalM + totalF + totalW;
    html += `
    <tr class="grandtotal">
      <td><b>전교생</b></td>
      <td><b>${totalM}</b></td>
      <td><b>${totalF}</b></td>
      <td><b>${totalW}</b></td>
      <td><b>${grandTotal}</b></td>
    </tr>
  </table>
  `;

    summaryBox.innerHTML = html;

    // 반별 인원 요약표 추가
    const classSummary = {};
    data.forEach(s => {
        let grade = parseInt(s["학년"]);
        const cls = parseInt(s["반"]);

        // [수정] 학년이 연도로 표시된 경우 학번 첫 자리 추출
        if (grade > 10 && s["학번"]) {
            const sNum = String(s["학번"]);
            grade = parseInt(sNum[0]) || grade;
        }

        const status = String(s["학적"] || "").trim();
        if (status.includes("자퇴") || status.includes("전출")) return;

        const key = `${grade}-${cls}`;
        if (!classSummary[key]) classSummary[key] = { male: 0, female: 0, total: 0, witak: 0 };

        if (s["성별"] === "남") classSummary[key].male++;
        else if (s["성별"] === "여") classSummary[key].female++;
        classSummary[key].total++;

        if (status.includes("위탁")) classSummary[key].witak++;
    });

    let classTable = `
  <h4>🧾 학년별 반별 인원 현황</h4>
  <table class="summary-table">
    <tr><th>학년-반</th><th>남</th><th>여</th><th>위탁</th><th>합계</th></tr>
`;

    Object.keys(classSummary)
        .sort((a, b) => {
            const [ga, ca] = a.split("-");
            const [gb, cb] = b.split("-");
            return ga === gb ? ca - cb : ga - gb;
        })
        .forEach(key => {
            const [grade, cls] = key.split("-");
            const v = classSummary[key];
            classTable += `
      <tr>
        <td>
          <a href="stu-list.html?grade=${grade}&class=${cls}" style="color: #007aff; text-decoration: none; font-weight: bold;">
            ${grade}-${cls}
          </a>
        </td>
        <td>${v.male}</td>
        <td>${v.female}</td>
        <td>${v.witak}</td>
        <td>${v.total}</td>
      </tr>
    `;
        });

    classTable += "</table>";
    summaryBox.innerHTML += classTable;
}

function renderResults(results) {
    const resultBox = document.getElementById("results");
    const countBox = document.getElementById("result-count");

    if (results.length === 0) {
        resultBox.innerHTML = "❌ 검색 결과가 없습니다.";
        countBox.innerHTML = "";
        return;
    }

    countBox.innerHTML = `🔹 총 ${results.length}건 검색되었습니다.`;

    resultBox.innerHTML = results.map(student => {
        const photoUrl = student["사진저장링크"] || "";
        const fileId = extractDriveId(photoUrl);

        let bgUrl;
        if (photoUrl.startsWith('http') && !photoUrl.includes('drive.google.com')) {
            // Supabase 스토리지 등 직접 링크인 경우
            bgUrl = photoUrl;
        } else {
            // 구글 드라이브인 경우 썸네일 사용
            bgUrl = getThumbnailUrl(fileId);
        }

        const phone = student["학생폰"] || "";
        const phoneTag = phone
            ? `<div class="phone-actions">
          <a href="tel:${phone}">📞</a>
          ${phone}
          <a href="sms:${phone}">💬</a>
         </div>`
            : "📞 번호 없음";

        return `
      <div class="result-item">
        <img src="${bgUrl}" alt="사진" loading="lazy" onerror="this.src='https://via.placeholder.com/120x150?text=No+Image'"/>
        <div class="info-box">
          <strong>${student["이름"]}</strong> (${student["학번"] || "----"})<br>
          ${phoneTag}
          🏫 ${student["출신중"] || "출신중 없음"}<br>
          🏠 ${student["집주소"] || "주소 없음"}<br>
          📘 ${student["학적"] || "재학중"}
        </div>
      </div>
    `;
    }).join('');
}
