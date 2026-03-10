import { fetchAllStudents } from './api.js';
import { extractDriveId, getThumbnailUrl } from './utils.js';

document.addEventListener("DOMContentLoaded", async () => {
    const summaryBox = document.getElementById("summary");
    const resultBox = document.getElementById("results");
    const countBox = document.getElementById("result-count");
    const searchForm = document.getElementById("searchForm");

    // 초기 로드: 통계 표시
    if (summaryBox) {
        summaryBox.innerHTML = `<div class="loader"></div><p>통계 불러오는 중...</p>`;
        await loadAllDataForSummary();
    }

    // 검색 이벤트
    if (searchForm) {
        searchForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const category = document.getElementById("category").value;
            const keyword = document.getElementById("keyword").value.trim();

            if (resultBox) resultBox.innerHTML = `<div class="loader"></div><p>검색 중...</p>`;
            if (countBox) countBox.innerHTML = "";
            if (summaryBox) summaryBox.innerHTML = "";

            try {
                const data = await fetchAllStudents();
                const results = data.filter(student => {
                    // [추가] 전출/자퇴생은 검색 결과(현황)에서 제외
                    const status = String(student["학적"] || "").trim();
                    if (status.includes("전출") || status.includes("자퇴")) return false;

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
                loadSummaryTable(results);

            } catch (error) {
                console.error("Search Error:", error);
                if (resultBox) resultBox.innerHTML = "⚠️ 검색 중 오류가 발생했습니다.";
            }
        });
    }

    // 활동 로그 기록
    try {
        const { getCurrentTeacherEmail, logPageView } = await import('./api.js');
        const myEmail = getCurrentTeacherEmail();
        if (myEmail) {
            logPageView(myEmail, "통계 및 검색");
        }
    } catch (e) {
        console.warn("Logging failed:", e);
    }
});

async function loadAllDataForSummary() {
    const summaryBox = document.getElementById("summary");
    try {
        const data = await fetchAllStudents();
        loadSummaryTable(data);
    } catch (error) {
        console.error("Summary Load Error:", error);
        if (summaryBox) summaryBox.innerHTML = "⚠️ 통계 데이터를 불러오지 못했습니다.";
    }
}

function loadSummaryTable(data) {
    const summaryBox = document.getElementById("summary");
    if (!summaryBox) return;

    const summary = {};

    data.forEach(s => {
        let grade = parseInt(s["학년"]);
        const cls = parseInt(s["반"]);
        const status = String(s["학적"] || "").trim();

        if (grade > 10 && s["학번"]) {
            const sNum = String(s["학번"]);
            grade = parseInt(sNum[0]) || grade;
        }

        if (!grade || !cls || isNaN(grade) || isNaN(cls)) return;
        if (status.includes("자퇴") || status.includes("전출")) return;

        let major = "미지정";
        if ([1, 2, 3].includes(cls)) major = "IoT전기과";
        else if (grade === 1 && [4, 5, 6].includes(cls)) major = "게임콘텐츠과";
        else if (grade >= 2 && [4, 5, 6].includes(cls)) major = "전자제어과";

        const key = `${grade}-${major}`;
        if (!summary[key]) summary[key] = { grade, major, m: 0, f: 0, witak: 0, headcount: 0 };

        summary[key].headcount++; // 실제 인원수 증가

        const gender = String(s["성별"] || "").trim();
        if (gender === "남" || gender === "남자") summary[key].m++;
        else if (gender === "여" || gender === "여자") summary[key].f++;

        if (status.includes("위탁")) summary[key].witak++;
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

    let totalM = 0, totalF = 0, totalW = 0, totalH = 0;

    for (const grade in grouped) {
        const rows = grouped[grade];
        let subM = 0, subF = 0, subW = 0, subH = 0;

        rows.forEach(r => {
            const sum = r.headcount; // r.m + r.f + r.witak 대신 r.headcount 사용
            subM += r.m;
            subF += r.f;
            subW += r.witak;
            subH += sum;
            html += `<tr>
                <td>${r.grade}학년 ${r.major}</td>
                <td>${r.m}</td>
                <td>${r.f}</td>
                <td>${r.witak}</td>
                <td>${sum}</td>
            </tr>`;
        });

        const subTotal = subH; // 성별+위탁 합산 대신 실제 인원수 합산 사용
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
        totalH += subH;
    }

    const grandTotal = totalH; // 실제 누적 합계 사용
    html += `
        <tr class="grandtotal">
            <td><b>전교생</b></td>
            <td><b>${totalM}</b></td>
            <td><b>${totalF}</b></td>
            <td><b>${totalW}</b></td>
            <td><b>${grandTotal}</b></td>
        </tr>
    </table>`;

    summaryBox.innerHTML = html;

    // 반별 인원 현황
    const classSummary = {};
    data.forEach(s => {
        let grade = parseInt(s["학년"]);
        const cls = parseInt(s["반"]);
        const status = String(s["학적"] || "").trim();

        if (grade > 10 && s["학번"]) {
            const sNum = String(s["학번"]);
            grade = parseInt(sNum[0]) || grade;
        }

        if (status.includes("자퇴") || status.includes("전출")) return;

        const key = `${grade}-${cls}`;
        if (!classSummary[key]) classSummary[key] = { m: 0, f: 0, total: 0, witak: 0 };

        const gender = String(s["성별"] || "").trim();
        if (gender === "남" || gender === "남자") classSummary[key].m++;
        else if (gender === "여" || gender === "여자") classSummary[key].f++;

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
            return ga === gb ? parseInt(ca) - parseInt(cb) : parseInt(ga) - parseInt(gb);
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
                    <td>${v.m}</td>
                    <td>${v.f}</td>
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

    if (!resultBox) return;

    if (results.length === 0) {
        resultBox.innerHTML = "❌ 검색 결과가 없습니다.";
        if (countBox) countBox.innerHTML = "";
        return;
    }

    if (countBox) countBox.innerHTML = `🔹 총 ${results.length}건 검색되었습니다.`;

    resultBox.innerHTML = results.map(student => {
        const photoUrl = student["사진저장링크"] || student.photo_url || "";
        const fileId = extractDriveId(photoUrl);

        let bgUrl;
        if (photoUrl.startsWith('http') && !photoUrl.includes('drive.google.com')) {
            bgUrl = photoUrl;
        } else {
            bgUrl = getThumbnailUrl(fileId);
        }

        const phone = student["학생폰"] || "";
        const phoneTag = phone
            ? `<div class="phone-actions">
                <a href="tel:${phone}">📞</a> ${phone} <a href="sms:${phone}">💬</a>
              </div>`
            : "📞 번호 없음";

        return `
            <div class="result-item" onclick="window.location.href='./record.html?num=${student.student_id || student['학번']}&name=${encodeURIComponent(student.name || student['이름'])}'">
                <img src="${bgUrl}" alt="사진" loading="lazy" onerror="this.src='./default.png'"/>
                <div class="info-box">
                    <strong>${student["이름"] || student.name}</strong> (${student["학번"] || student.student_id || "----"})<br>
                    ${phoneTag}<br>
                    🏫 ${student["출신중"] || "-"}<br>
                    🏠 ${student["집주소"] || student["주소"] || "-"}<br>
                    📘 ${student["학적"] || "재학중"}
                </div>
            </div>
        `;
    }).join('');
}
