/* analysis.js - Omni-Perspective AI Integration Logic */
import { supabase } from './supabase.js';

let currentStudent = null;
let currentInsight = null;

document.addEventListener("DOMContentLoaded", () => {
    initSearch();
    initLensSelector();
});

// 1. 학생 검색 기능
function initSearch() {
    const searchInput = document.getElementById("student-search");
    const resultsDropdown = document.getElementById("search-results");

    searchInput.addEventListener("input", async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            resultsDropdown.style.display = "none";
            return;
        }

        const { data, error } = await supabase
            .from('students')
            .select('pid, student_id, name, class_info')
            .or(`name.ilike.%${query}%,student_id.ilike.%${query}%`)
            .limit(10);

        if (data && data.length > 0) {
            renderSearchResults(data);
        } else {
            resultsDropdown.style.display = "none";
        }
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
            const pid = item.getAttribute("data-pid");
            loadStudentAnalysis(pid);
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

    // 학생 기본 정보 가져오기
    const { data: student, error: sError } = await supabase
        .from('students')
        .select('*')
        .eq('pid', pid)
        .single();

    if (sError) return alert("학생 정보를 불러오지 못했습니다.");
    currentStudent = student;

    // 기존 분석 결과(캐시) 확인
    const { data: insight, error: iError } = await supabase
        .from('student_insights')
        .select('*')
        .eq('student_pid', pid)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (insight) {
        currentInsight = insight.content;
        renderAnalysis();
    } else {
        // AI 분석 트리거 예정 (현재는 가공 데이터가 없는 경우를 위한 임시 가이드 제공)
        await triggerAIAnalysis(pid);
    }
}

// 3. AI 분석 트리거 (Gemini API 연동)
async function triggerAIAnalysis(pid) {
    // 1) API 키 확인 (환경 변수 또는 로컬 스토리지)
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        apiKey = prompt("제미나이(Gemini) API 키를 입력해주세요. (한 번 입력하면 기기에 저장됩니다)");
        if (!apiKey) {
            alert("API 키가 없어 분석을 진행할 수 없습니다.");
            document.getElementById("loading-view").style.display = "none";
            document.getElementById("welcome-view").style.display = "block";
            return;
        }
        localStorage.setItem('gemini_api_key', apiKey);
    }

    try {
        // 2) 분석용 데이터 수집 (설문 + 생활기록)
        const [surveyRes, recordsRes] = await Promise.all([
            supabase.from('surveys').select('data').eq('student_pid', pid).order('submitted_at', { ascending: false }).limit(1),
            supabase.from('life_records').select('category, content, is_positive, created_at').eq('student_pid', pid).order('created_at', { ascending: false }).limit(10)
        ]);

        const surveyData = surveyRes.data?.[0]?.data || {};
        const recordsData = recordsRes.data || [];

        // 3) 제미나이 프롬프트 작성 (Omni-Perspective JSON Output)
        const promptText = `
너는 고등학교 베테랑 교사이자, 수사관, 심리 분석가야.
다음 학생의 기본 정보, 기초조사 설문 응답, 주요 지점 기록을 분석해서 아래 JSON 형식에 완벽하게 맞춰서 '통합 인사이트'를 도출해 줘. 

[분석할 데이터]
학생: ${currentStudent.name} (${currentStudent.class_info})
성별: ${currentStudent.gender}
기록 데이터: ${JSON.stringify(recordsData)}
설문 데이터: ${JSON.stringify(surveyData)}

[JSON 응답 포맷] (반드시 순수 JSON 텍스트만 출력해. 코드블록 태그 쓰지 마)
{
  "summary": "학생의 성향, 현재 상태에 대한 3줄 종합 요약 (교사 참고용)",
  "tags": ["태그1", "태그2", "태그3"],
  "stats": {"study": 50, "routine": 50, "emotion": 50, "social": 50, "self": 50, "resilience": 50}, // 0~100 사이 정수 (학업,루틴,정서,사회성,자아성찰,회복탄력성)
  "quadrant": {"x": 0, "y": 0, "type": "열정적 리더"}, // x: 사회성(-100~100), y: 내적동기(-100~100), type: 사분면 유형명
  "rpg": {
    "class": "게임 직업명 (예: 은둔형 마법사)",
    "item": "이 학생만의 고유 강점이나 무기",
    "stats": {"STR": 10, "INT": 10, "CHA": 10} // 1~20 사이 수치
  },
  "detective": {
    "clues": ["단서1", "단서2"],
    "deduction": "모순점이나 심층적으로 살펴봐야 할 추론 결과"
  },
  "garden": {
    "species": "꽃/식물 비유 (예: 단단한 선인장)",
    "condition": "정서적 상태 (예: 수분 보충 필요)"
  },
  "action": "선생님이 다음번에 만날 때 바로 건네면 좋은 짧은 대화 추천이나 액션 플랜"
}`;

        // 4) Gemini API 호출
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const result = await response.json();
        if (result.error) {
            console.error("Gemini Error:", result.error);
            if (result.error.code === 400 && result.error.message.includes('API key')) {
                localStorage.removeItem('gemini_api_key');
            }
            throw new Error(result.error.message || "API 호출 실패");
        }

        const rawText = result.candidates[0].content.parts[0].text;

        let insightData;
        try {
            insightData = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
        } catch (e) {
            console.error("JSON 파싱 에러:", rawText);
            throw new Error("AI 응답 형식이 올바르지 않습니다.");
        }

        // 5) DB에 캐싱 저장
        await supabase.from('student_insights').insert([
            { student_pid: pid, insight_type: 'omni', content: insightData }
        ]);

        currentInsight = insightData;
        renderAnalysis();

    } catch (err) {
        alert("분석 중 오류가 발생했습니다: " + err.message);
        document.getElementById("loading-view").style.display = "none";
        document.getElementById("welcome-view").style.display = "block";
    }
}


// 4. 분석 결과 렌더링 및 렌즈 전환
function initLensSelector() {
    const selector = document.getElementById("lens-selector");
    selector.addEventListener("change", () => {
        if (currentInsight) renderAnalysis();
    });
}

function renderAnalysis() {
    const lensType = document.getElementById("lens-selector").value;
    const contentArea = document.getElementById("lens-content");

    document.getElementById("loading-view").style.display = "none";
    document.getElementById("result-view").style.display = "block";
    document.getElementById("view-student-name").innerText = currentStudent.name;
    document.getElementById("view-student-info").innerText = `${currentStudent.class_info} ${currentStudent.student_id ? currentStudent.student_id : ''}`;

    let html = "";
    switch (lensType) {
        case 'summary':
            html = `
                <div class="fade-in">
                    <h3 style="color:#4A90E2">⭐ AI 핵심 요약</h3>
                    <p style="font-size:1.1rem; line-height:1.6; background:#f8f9fa; padding:15px; border-radius:12px;">${currentInsight.summary}</p>
                    <div style="margin-top:20px;">
                        <strong>핵심 태그:</strong> 
                        <span class="badge">#학구파</span> <span class="badge">#전략가</span>
                    </div>
                </div>`;
            break;
        case 'stats':
            html = `<div class="fade-in"><h3>📊 수치 분석 (준비 중)</h3><p>육각형 차트는 Chart.js 연동 후 공개됩니다.</p></div>`;
            break;
        case 'rpg':
            html = `
                <div class="fade-in rpg-view">
                    <h3 style="color:#6C5CE7">🎮 RPG 캐릭터 시트</h3>
                    <div style="background:#2D3436; color:#00FF00; padding:20px; border-radius:12px; font-family:'Courier New'">
                        [CLASS]: ${currentInsight.rpg.class}<br>
                        [SKILL]: ${currentInsight.rpg.item}<br>
                        [INT]: ${currentInsight.rpg.stats.INT} (Top Tier)
                    </div>
                </div>`;
            break;
        case 'detective':
            html = `<div class="fade-in"><h3>🕵️ 탐정의 추론</h3><p>${currentInsight.detective.deduction}</p></div>`;
            break;
        case 'garden':
            html = `<div class="fade-in"><h3>🌿 식물 성장 정원</h3><p>유형: ${currentInsight.garden.species}</p></div>`;
            break;
    }

    contentArea.innerHTML = html;
}
