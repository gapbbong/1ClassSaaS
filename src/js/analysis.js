/* analysis.js - Omni-Perspective AI Integration Logic (Incremental Loading Version) */
import { supabase } from './supabase.js';

let currentStudent = null;
let currentInsight = {}; // 부분적 업데이트를 위해 객체로 관리
let currentMode = 'individual'; // 'individual' or 'class'
let currentClassInfo = null;
let analysisChart = null;

document.addEventListener("DOMContentLoaded", () => {
    initModeToggle();
    initSearch();
    initClassSelect();
});

// 0. 모드 전환
function initModeToggle() {
    const radios = document.querySelectorAll('input[name="analysis-mode"]');
    const indContainer = document.getElementById("individual-search-container");
    const clsContainer = document.getElementById("class-select-container");
    const welcomeText = document.querySelector("#welcome-view h2");

    radios.forEach(r => {
        r.addEventListener("change", (e) => {
            currentMode = e.target.value;
            if (currentMode === 'individual') {
                indContainer.style.display = "block";
                clsContainer.style.display = "none";
                welcomeText.innerText = "학생을 선택하여 분석을 시작하세요";
            } else {
                indContainer.style.display = "none";
                clsContainer.style.display = "flex";
                welcomeText.innerText = "분석할 학급을 선택하여 분석을 시작하세요";
            }
            // 뷰 초기화
            document.getElementById("welcome-view").style.display = "block";
            document.getElementById("result-view").style.display = "none";
            currentInsight = {};
        });
    });
}

// 0-1. 학급 목록 로드
async function initClassSelect() {
    const dropdown = document.getElementById("class-dropdown");
    const analyzeBtn = document.getElementById("class-analyze-btn");

    try {
        const { data, error } = await supabase
            .from('students')
            .select('class_info')
            .neq('class_info', null);

        if (!error && data) {
            const uniqueClasses = [...new Set(data.map(item => item.class_info))].sort();
            uniqueClasses.forEach(cls => {
                const opt = document.createElement("option");
                opt.value = cls;
                opt.textContent = cls + " 학급";
                dropdown.appendChild(opt);
            });
        }

        dropdown.addEventListener("change", (e) => {
            analyzeBtn.disabled = !e.target.value;
        });

        analyzeBtn.addEventListener("click", () => {
            if (dropdown.value) loadClassAnalysis(dropdown.value);
        });
    } catch (e) {
        console.error("클래스 목록 로드 오류", e);
    }
}

// 1. 학생 검색
function initSearch() {
    const searchInput = document.getElementById("student-search");
    const resultsDropdown = document.getElementById("search-results");

    searchInput.addEventListener("input", async (e) => {
        const searchQuery = e.target.value.trim();
        if (searchQuery.length < 2) {
            resultsDropdown.style.display = "none";
            return;
        }

        const { data, error } = await supabase
            .from('students')
            .select('pid, student_id, name, class_info, gender, photo_url')
            .or(`name.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`)
            .limit(10);

        if (data && data.length > 0) renderSearchResults(data);
        else resultsDropdown.style.display = "none";
    });
}

function renderSearchResults(students) {
    const resultsDropdown = document.getElementById("search-results");
    resultsDropdown.innerHTML = students.map(s => `
        <div class="search-item" data-pid="${s.pid}">
            <strong>${s.name}</strong> (${s.student_id}) - ${s.class_info}
        </div>
    `).join('');
    resultsDropdown.style.display = "block";

    resultsDropdown.querySelectorAll(".search-item").forEach(item => {
        item.addEventListener("click", () => {
            loadStudentAnalysis(item.getAttribute("data-pid"));
            resultsDropdown.style.display = "none";
            document.getElementById("student-search").value = "";
        });
    });
}

// 2. 학생 분석 데이터 로드 (캐시 우선)
async function loadStudentAnalysis(pid) {
    document.getElementById("welcome-view").style.display = "none";
    document.getElementById("loading-view").style.display = "block";
    document.getElementById("result-view").style.display = "none";

    const { data: student } = await supabase.from('students').select('*').eq('pid', pid).single();
    if (!student) return alert("학생 정보를 찾을 수 없습니다.");
    currentStudent = student;

    const { data: insight } = await supabase
        .from('student_insights')
        .select('*')
        .eq('student_pid', pid)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (insight) {
        currentInsight = insight.content;
        renderResultView();
        Object.keys(currentInsight).forEach(key => updateSectionUI(key, currentInsight[key]));
        renderChart();
    } else {
        await runBatchAIAnalysis(pid);
    }
}

// Batch AI Analysis (Sequential steps for better UX)
async function runBatchAIAnalysis(pid) {
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        apiKey = prompt("제미나이(Gemini) API 키를 입력해주세요.");
        if (!apiKey) return location.reload();
        localStorage.setItem('gemini_api_key', apiKey);
    }

    // 1. Prepare Data
    const [surveyRes, recordsRes] = await Promise.all([
        supabase.from('surveys').select('data').eq('student_pid', pid).order('submitted_at', { ascending: false }).limit(1),
        supabase.from('life_records').select('category, content, is_positive').eq('student_pid', pid).order('created_at', { ascending: false }).limit(10)
    ]);

    const surveyData = surveyRes.data?.[0]?.data || {};
    const recordsData = (recordsRes.data || []).filter(r => r.content && r.content.trim().length > 9);

    // UI 스켈레톤 노출
    document.getElementById("loading-view").style.display = "none";
    renderResultView();
    currentInsight = {};

    const commonContext = `
        학생: ${currentStudent.name} (${currentStudent.class_info})
        성별: ${currentStudent.gender}
        기록: ${JSON.stringify(recordsData)}
        설문: ${JSON.stringify(surveyData)}
    `;

    try {
        // Step 1: Core (Summary, Tags, Stats)
        const step1Data = await callGeminiAPI(apiKey, `
            위 데이터를 분석해서 요약과 수치 평가를 해줘.
            JSON 포맷: {
              "summary": "3줄 요약",
              "tags": ["태그1", "태그2", "태그3"],
              "stats": {"study": 50, "routine": 50, "emotion": 50, "social": 50, "self": 50, "resilience": 50}
            }
        `, commonContext);

        currentInsight = { ...currentInsight, ...step1Data };
        updateSectionUI('summary', step1Data.summary, step1Data.tags);
        updateSectionUI('stats', step1Data.stats);
        renderChart();

        // Step 2: Deep Analysis (Detective, Garden)
        const step2Data = await callGeminiAPI(apiKey, `
            위 데이터를 바탕으로 탐정 관점과 생태계 비유 분석을 해줘.
            JSON 포맷: {
              "detective": {"clues": ["단서1"], "deduction": "추론"},
              "garden": {"species": "꽃이름", "condition": "상태"}
            }
        `, commonContext);

        currentInsight = { ...currentInsight, ...step2Data };
        updateSectionUI('detective', step2Data.detective);
        updateSectionUI('garden', step2Data.garden);

        // Step 3: Synthesis (Action Plan)
        const step3Data = await callGeminiAPI(apiKey, `
            모든 분석을 종합해서 교사에게 추천하는 짧은 액션 플랜을 제안해줘.
            JSON 포맷: { "action": "실행 가이드" }
        `, commonContext);

        currentInsight = { ...currentInsight, ...step3Data };
        updateSectionUI('action', step3Data.action);

        // Final Save to DB (Full Insight)
        await supabase.from('student_insights').insert([{ student_pid: pid, insight_type: 'omni', content: currentInsight }]);

    } catch (err) {
        console.error("AI Analysis Failed", err);
    }
}

// 3. Class Analysis
async function loadClassAnalysis(classInfo) {
    document.getElementById("welcome-view").style.display = "none";
    document.getElementById("loading-view").style.display = "block";
    document.getElementById("result-view").style.display = "none";

    currentStudent = null;
    currentClassInfo = classInfo;
    currentInsight = {};

    await runBatchClassAnalysis(classInfo);
}

async function runBatchClassAnalysis(classInfo) {
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (!apiKey) return alert("API Key Required");

    const { data: students } = await supabase.from('students').select('pid, name, student_id').eq('class_info', classInfo);
    const pids = students.map(s => s.pid);

    const [surveyRes, recordsRes] = await Promise.all([
        supabase.from('surveys').select('student_pid, data').in('student_pid', pids),
        supabase.from('life_records').select('student_pid, category, content, is_positive').in('student_pid', pids)
    ]);

    const classDataSnippet = students.map(st => ({
        name: st.name,
        records: (recordsRes.data || []).filter(r => r.student_pid === st.pid && r.content.length > 9).map(r => r.content)
    }));

    renderResultView();

    const commonContext = `학급명: ${classInfo}, 데이터: ${JSON.stringify(classDataSnippet)}`;

    try {
        const s1 = await callGeminiAPI(apiKey, `학급 분위기 요약과 태그를 생성해줘. JSON: {"summary": "요약", "tags": ["T1"]}`, commonContext);
        updateSectionUI('summary', s1.summary, s1.tags);

        const s2 = await callGeminiAPI(apiKey, `학급 내 관찰 패턴과 비유 분석을 해줘. JSON: {"detective": {"clues":[], "deduction":""}, "garden": {"species": "", "condition": ""}}`, commonContext);
        updateSectionUI('detective', s2.detective);
        updateSectionUI('garden', s2.garden);

        const s3 = await callGeminiAPI(apiKey, `학급 경영 가이드를 제안해줘. JSON: {"action": ""}`, commonContext);
        updateSectionUI('action', s3.action);
    } catch (e) {
        console.error("Class Analysis Error", e);
    }
}

// Helper: Call Gemini
async function callGeminiAPI(apiKey, prompt, context) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: context + "\n" + prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });
    const res = await response.json();
    if (res.error) throw new Error(res.error.message);
    const text = res.candidates[0].content.parts[0].text;
    return JSON.parse(text);
}

// UI: Initial Result View (Skeleton)
function renderResultView() {
    document.getElementById("result-view").style.display = "block";
    const photoMini = document.getElementById("student-photo-mini");
    const headerName = document.getElementById("view-student-name");
    const headerInfo = document.getElementById("view-student-info");

    if (currentStudent) {
        headerName.innerText = currentStudent.name;
        headerInfo.innerText = `${currentStudent.class_info} ${currentStudent.student_id || ''}`;
        if (currentStudent.photo_url) {
            const { data } = supabase.storage.from('student_photos').getPublicUrl(currentStudent.photo_url);
            photoMini.innerHTML = `<img src="${data.publicUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            photoMini.innerHTML = "👤";
        }
    } else {
        headerName.innerText = `${currentClassInfo} 학급 전체`;
        headerInfo.innerText = "통합 분석";
        photoMini.innerHTML = "🏫";
    }

    document.getElementById("lens-content").innerHTML = `
        <div id="sec-summary" class="result-card loading-section"><h3>⭐ AI 핵심 요약</h3><div class="mini-spinner"></div><p class="status-text">분석 중...</p></div>
        <div id="sec-stats" class="result-card loading-section" style="${currentMode === 'class' ? 'display:none' : ''}"><h3>📊 다면 평가 수치</h3><div class="mini-spinner"></div></div>
        <div class="analysis-grid">
            <div id="sec-detective" class="result-card loading-section"><h3>🕵️ 특이점 추론</h3><div class="mini-spinner"></div></div>
            <div id="sec-garden" class="result-card loading-section"><h3>🌿 현재 상태</h3><div class="mini-spinner"></div></div>
        </div>
        <div id="sec-action" class="result-card loading-section"><h3>💡 추천 액션 플랜</h3><div class="mini-spinner"></div></div>
    `;
}

// UI: Update specific section
function updateSectionUI(type, data, extra) {
    const el = document.getElementById(`sec-${type}`);
    if (!el) return;
    el.classList.remove('loading-section');

    switch (type) {
        case 'summary':
            el.innerHTML = `<h3>⭐ AI 핵심 요약</h3><p style="font-size:1.1rem; line-height:1.6; background:#f8fafc; padding:18px; border-radius:12px;">${data}</p>
                            <div style="margin-top:10px;">${(extra || []).map(t => `<span class="badge" style="background:#4A90E2; color:white; padding:4px 8px; border-radius:4px; font-size:0.85rem; margin-right:6px;">#${t}</span>`).join('')}</div>`;
            break;
        case 'stats':
            el.innerHTML = `<h3>📊 다면 평가 수치</h3><div style="height:300px; display:flex; justify-content:center;"><canvas id="aiStatsChart"></canvas></div>`;
            break;
        case 'detective':
            el.innerHTML = `<h3>🕵️ 특이점 추론</h3><div style="background:#fdf6e3; padding:16px; border-radius:12px; border-left:4px solid #D35400;">
                            <p style="font-weight:bold; margin-bottom:8px;">단서</p><ul style="margin-left: 20px;">${(data.clues || []).map(c => `<li>${c}</li>`).join('')}</ul>
                            <p style="margin-top:10px; font-weight:bold;">추론 결과</p><p>${data.deduction}</p></div>`;
            break;
        case 'garden':
            el.innerHTML = `<h3>🌿 현재 상태</h3><div style="background:#eafaf1; padding:16px; border-radius:12px; border-left:4px solid #27AE60;">
                            <p><strong>비유:</strong> <span style="font-size:1.1rem; color:#1e8449;">${data.species}</span></p>
                            <p><strong>상태:</strong> ${data.condition}</p></div>`;
            break;
        case 'action':
            el.innerHTML = `<h3 style="color:#4A90E2;">💡 추천 액션 플랜</h3><p style="font-size:1.1rem; font-weight:bold; background:#f0f7ff; padding:16px; border-radius:12px;">${data}</p>`;
            break;
    }
    el.classList.add('fade-in');
}

// UI: Radar Chart
function renderChart() {
    const ctx = document.getElementById('aiStatsChart')?.getContext('2d');
    if (!ctx || !currentInsight.stats) return;
    if (analysisChart) analysisChart.destroy();

    const s = currentInsight.stats;
    analysisChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['학업', '루틴', '정서', '사회성', '자아성찰', '회복탄력성'],
            datasets: [{ label: 'AI 분석', data: [s.study, s.routine, s.emotion, s.social, s.self, s.resilience], backgroundColor: 'rgba(74, 144, 226, 0.2)', borderColor: '#4A90E2', borderWidth: 2 }]
        },
        options: { scales: { r: { suggestedMin: 0, suggestedMax: 100, ticks: { display: false } } }, plugins: { legend: { display: false } } }
    });
}
