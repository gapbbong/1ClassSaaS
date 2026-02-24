/* analysis.js - Omni-Perspective AI Integration Logic */
import { supabase } from './supabase.js';

let currentStudent = null;
let currentInsight = null;
let currentMode = 'individual'; // 'individual' or 'class'
let currentClassInfo = null;
let analysisChart = null; // 차트 인스턴스 관리용

document.addEventListener("DOMContentLoaded", () => {
    initModeToggle();
    initSearch();
    initClassSelect();
    initLensSelector();
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
            currentInsight = null;
        });
    });
}

// 0-1. 학급 목록 로드 및 선택
async function initClassSelect() {
    const dropdown = document.getElementById("class-dropdown");
    const analyzeBtn = document.getElementById("class-analyze-btn");

    try {
        // 학급 목록 추출 (고유 담당 학급)
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
            if (e.target.value) {
                analyzeBtn.disabled = false;
            } else {
                analyzeBtn.disabled = true;
            }
        });

        analyzeBtn.addEventListener("click", () => {
            if (dropdown.value) {
                loadClassAnalysis(dropdown.value);
            }
        });
    } catch (e) {
        console.error("클래스 목록 로드 오류", e);
    }
}


// 1. 학생 검색 기능
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

        if (error) {
            console.error("학생 검색 오류:", error);
            resultsDropdown.style.display = "none";
            return;
        }

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

// 3. AI 개별 분석 트리거
async function triggerAIAnalysis(pid) {
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
        const [surveyRes, recordsRes] = await Promise.all([
            supabase.from('surveys').select('data').eq('student_pid', pid).order('submitted_at', { ascending: false }).limit(1),
            supabase.from('life_records').select('category, content, is_positive, created_at').eq('student_pid', pid).order('created_at', { ascending: false }).limit(10)
        ]);

        const surveyData = surveyRes.data?.[0]?.data || {};

        // 데이터 필터링 (무의미한 짧은 기록 제외, 9글자 이하 등)
        const rawRecords = recordsRes.data || [];
        const recordsData = rawRecords.filter(r => r.content && r.content.trim().length > 9);

        // 설문 역시 연락처 등은 삭제
        const excludeSurveyKeys = ['비밀번호', '주소', '집주소', '연락처', '학생폰', '주보호자 연락처', '보조보호자 연락처', 'MBTI']; // 개별 분석 시에는 굳이 삭제 안해도 되나, 토큰 절약
        Object.keys(surveyData).forEach(k => {
            if (excludeSurveyKeys.includes(k) || (surveyData[k] && String(surveyData[k]).trim().length < 2)) {
                delete surveyData[k];
            }
        });

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

// 3-1. AI 학급 전체 분석 로드 및 트리거
async function loadClassAnalysis(classInfo) {
    document.getElementById("welcome-view").style.display = "none";
    document.getElementById("loading-view").style.display = "block";
    document.getElementById("result-view").style.display = "none";

    currentStudent = null; // 학급 모드이므로 개별 학생 초기화
    currentClassInfo = classInfo;

    // 캐시 확인 로직 생략(학급은 항상 갱신되거나 다른 테이블 사용, 일단 호출)
    await triggerClassAIAnalysis(classInfo);
}

async function triggerClassAIAnalysis(classInfo) {
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        apiKey = prompt("제미나이(Gemini) API 키를 입력해주세요.");
        if (!apiKey) {
            alert("API 키가 없어 분석을 진행할 수 없습니다.");
            document.getElementById("loading-view").style.display = "none";
            document.getElementById("welcome-view").style.display = "block";
            return;
        }
        localStorage.setItem('gemini_api_key', apiKey);
    }

    try {
        // 1. 해당 학급 학생 모두 찾기
        const { data: students, error: sError } = await supabase
            .from('students')
            .select('pid, name, student_id')
            .eq('class_info', classInfo);

        if (sError || !students.length) throw new Error("학급 학생 정보를 불러오지 못했습니다.");
        const pids = students.map(s => s.pid);

        // 2. 학생들의 최근 설문 및 생활기록 가져오기
        const [surveyRes, recordsRes] = await Promise.all([
            supabase.from('surveys').select('student_pid, data').in('student_pid', pids),
            supabase.from('life_records').select('student_pid, category, content, is_positive').in('student_pid', pids).order('created_at', { ascending: false })
        ]);

        // 3. 데이터 압축 매핑 (토큰 제한 방지)
        const classData = students.map(st => {
            const myRecords = (recordsRes.data || []).filter(r => r.student_pid === st.pid);
            // 9글자 이하 쓰레기 기록 제외 필터링
            const validRecords = myRecords.filter(r => r.content.trim().length > 9);

            const mySurveysList = (surveyRes.data || []).filter(s => s.student_pid === st.pid);
            let mySurvey = mySurveysList.length ? mySurveysList[mySurveysList.length - 1].data : {};

            // 설문 압축
            const excludeSurveyKeys = ['비밀번호', '주소', '집주소', '연락처', '학생폰', '주보호자 연락처', '보조보호자 연락처', 'MBTI', '이름', '학번', '번호'];
            Object.keys(mySurvey).forEach(k => {
                if (excludeSurveyKeys.includes(k) || (mySurvey[k] && String(mySurvey[k]).trim().length < 2)) {
                    delete mySurvey[k];
                }
            });

            return {
                name: st.name,
                id: st.student_id,
                survey: mySurvey,
                records: validRecords.map(r => `[${r.is_positive ? '긍정' : '부정'}] ${r.content}`)
            };
        });

        // 4. 프롬프트 생성
        const promptText = `
너는 베테랑 학급 담임교사이자, 학급 조직 분석가야.
우리 반 전체 학생들의 기록과 설문 응답을 기반으로, 현재 우리 반의 종합적인 생태계와 분위기를 분석해 줘.

[분석할 학급 데이터]
학급명: ${classInfo}
전체 데이터: ${JSON.stringify(classData)}

[JSON 응답 포맷] (반드시 순수 JSON 텍스트만 출력해. 코드블록 태그 쓰지 마)
{
  "summary": "우리 반의 현재 전반적인 분위기와 특징을 3~4줄로 생생체로 요약 (예: 활기차지만 집중력이 필요한 반)",
  "tags": ["태그1", "태그2", "태그3"],
  "rpg": {
    "class": "우리 반을 하나의 RPG 길드/파티로 비유하자면? (예: 돌격형 전사 파티, 마법사 연구회 등)",
    "item": "우리 반의 무기 (장점)",
    "stats": {"STR": 10, "INT": 10, "CHA": 10}
  },
  "detective": {
    "clues": ["반에서 포착된 특이 패턴 1", "특이 패턴 2"],
    "deduction": "주목해야 할(관찰이 필요한) 학생 유형이나 갈등/성장 요소 추론 (이름 노출 자제, 성향으로 언급)"
  },
  "garden": {
    "species": "전체 학급을 정원으로 비유한다면? (예: 활기찬 해바라기 밭)",
    "condition": "현재 필요한 영양분이나 환경 (예: 차분한 분위기 조성이 필요함)"
  },
  "action": "담임교사에게 추천하는 이번 달 학급 경영 / 액션 플랜 1줄 요약"
}`;

        // 5. Gemini 호출
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error.message || "API 호출 실패");

        const rawText = result.candidates[0].content.parts[0].text;
        let insightData;
        try {
            insightData = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
        } catch (e) {
            throw new Error("AI 응답 형식이 올바르지 않습니다.");
        }

        currentInsight = insightData;
        renderAnalysis();

    } catch (err) {
        alert("학급 분석 중 오류가 발생했습니다: " + err.message);
        document.getElementById("loading-view").style.display = "none";
        document.getElementById("welcome-view").style.display = "block";
    }
}


// 4. 분석 결과 전체 렌더링
function renderAnalysis() {
    const contentArea = document.getElementById("lens-content");

    document.getElementById("loading-view").style.display = "none";
    document.getElementById("result-view").style.display = "block";

    const photoMiniContainer = document.getElementById("student-photo-mini");

    if (currentMode === 'individual' && currentStudent) {
        document.getElementById("view-student-name").innerText = currentStudent.name;
        document.getElementById("view-student-info").innerText = `${currentStudent.class_info} ${currentStudent.student_id ? currentStudent.student_id : ''}`;

        // 학생 사진 표시
        if (currentStudent.photo_url) {
            const { data } = supabase.storage.from('student_photos').getPublicUrl(currentStudent.photo_url);
            photoMiniContainer.innerHTML = `<img src="${data.publicUrl}" alt="photo" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            photoMiniContainer.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 14px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
        }

    } else if (currentMode === 'class' && currentClassInfo) {
        document.getElementById("view-student-name").innerText = `${currentClassInfo} 학급 전체`;
        document.getElementById("view-student-info").innerText = `AI 통합 분석 브리핑`;
        // 학급의 경우 아이콘 표시
        photoMiniContainer.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 14px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
    }

    // 종합요약부터 생태계 정원까지 모든 인사이트를 한 번에 렌더링하도록 변경 (지연 페이드인 추가)
    let html = `
        <!-- 종합 요약 영역 -->
        <div class="fade-in result-card" style="margin-bottom: 24px; animation-delay: 0.1s; animation-fill-mode: both;">
            <h3 style="color:#4A90E2; margin-top:0;">⭐ AI 핵심 요약</h3>
            <p style="font-size:1.1rem; line-height:1.6; background:#f8fafc; padding:18px; border-radius:12px; margin-bottom: 12px;">${currentInsight.summary}</p>
            <div style="margin-top:10px;">
                <strong>핵심 태그:</strong> 
                ${(currentInsight.tags || []).map(t => `<span class="badge" style="background:var(--ai-primary); color:white; padding:4px 8px; border-radius:4px; font-size:0.85rem; margin-right:6px;">#${t}</span>`).join('')}
            </div>
        </div>
        
        <!-- 통계 및 분석 차트 영역 -->
        <div class="fade-in result-card" style="margin-bottom: 24px; animation-delay: 0.3s; animation-fill-mode: both;">
            <h3 style="color:#4A90E2; margin-top:0;">📊 다면 평가 수치</h3>
            <div style="position: relative; height:300px; width:100%; display:flex; justify-content:center; align-items:center; background:#f8fafc; border-radius:12px; padding:10px; box-sizing:border-box;">
                <canvas id="aiStatsChart"></canvas>
            </div>
        </div>
        
        <!-- 하단 그리드 (RPG, 탐정, 정원) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            <!-- RPG 시트 -->
            <div class="fade-in result-card rpg-view" style="animation-delay: 0.5s; animation-fill-mode: both;">
                <h3 style="color:#6C5CE7; margin-top:0;">🎮 고유 속성 (RPG)</h3>
                <div style="background:#2D3436; color:#00FF00; padding:16px; border-radius:12px; font-family:'Courier New', monospace; font-size: 0.95rem;">
                    [CLASS]: ${currentInsight.rpg?.class || '정보 없음'}<br>
                    [SKILL]: ${currentInsight.rpg?.item || '정보 없음'}<br>
                    [INT]: ${currentInsight.rpg?.stats?.INT || '?'} / [STR]: ${currentInsight.rpg?.stats?.STR || '?'} / [CHA]: ${currentInsight.rpg?.stats?.CHA || '?'}
                </div>
            </div>
            
            <!-- 탐정 추론 -->
            <div class="fade-in result-card" style="animation-delay: 0.7s; animation-fill-mode: both;">
                <h3 style="color:#D35400; margin-top:0;">🕵️ 특이점 추론 (Detective)</h3>
                <div style="background:#fdf6e3; padding:16px; border-radius:12px; border-left:4px solid #D35400; font-size: 0.95rem;">
                    <p style="font-weight:bold; margin-top:0; margin-bottom:8px;">발견된 단서 (Clues)</p>
                    <ul style="margin-left: 20px; color:#555; padding-left: 0;">
                        ${(currentInsight.detective?.clues || []).map(c => `<li style="margin-bottom:4px;">${c}</li>`).join('')}
                    </ul>
                    <p style="margin-top:12px; font-weight:bold; border-top:1px dashed #ccc; padding-top:10px;">추론 결과</p>
                    <p style="margin-bottom:0; color:#444;">${currentInsight.detective?.deduction || '단서 부족'}</p>
                </div>
            </div>
            
            <!-- 생태계 정원 -->
            <div class="fade-in result-card" style="animation-delay: 0.9s; animation-fill-mode: both;">
                <h3 style="color:#27AE60; margin-top:0;">🌿 현재 상태 (Garden)</h3>
                <div style="background:#eafaf1; padding:16px; border-radius:12px; border-left:4px solid #27AE60; font-size: 0.95rem; height: calc(100% - 32px);">
                    <p style="margin-top:0;"><strong>비유:</strong> <span style="font-size:1.05rem; color:#1e8449;">${currentInsight.garden?.species || '알 수 없음'}</span></p>
                    <p style="margin-top:8px;"><strong>현재 상태/필요 요소:</strong><br><span style="color:#444; display:inline-block; margin-top:4px;">${currentInsight.garden?.condition || '파악 불가'}</span></p>
                </div>
            </div>
        </div>
        
        <!-- 액션 플랜 (교사 조언) -->
        <div class="fade-in result-card" style="margin-top: 24px; border: 2px solid var(--ai-primary); background: #f0f7ff; animation-delay: 1.1s; animation-fill-mode: both;">
            <h3 style="color:var(--ai-primary); margin-top:0;">💡 교사를 위한 추천 액션 플랜</h3>
            <p style="font-size:1.05rem; font-weight:bold; color:#333; margin-bottom:0;">${currentInsight.action || '추천 플랜이 없습니다.'}</p>
        </div>
    `;

    contentArea.innerHTML = html;

    // 차트 렌더링 로직 (항상 렌더링)
    const ctx = document.getElementById('aiStatsChart')?.getContext('2d');
    if (ctx) {
        if (analysisChart) {
            analysisChart.destroy();
        }

        const statsData = currentInsight.stats || {};
        const labels = ['학업(Study)', '루틴(Routine)', '정서(Emotion)', '사회성(Social)', '자아성찰(Self)', '회복탄력성(Resilience)'];
        const data = [
            statsData.study || 0,
            statsData.routine || 0,
            statsData.emotion || 0,
            statsData.social || 0,
            statsData.self || 0,
            statsData.resilience || 0
        ];

        analysisChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'AI 다면 평가 수치',
                    data: data,
                    backgroundColor: 'rgba(74, 144, 226, 0.2)',
                    borderColor: 'rgba(74, 144, 226, 1)',
                    pointBackgroundColor: 'rgba(108, 92, 231, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(108, 92, 231, 1)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        pointLabels: {
                            font: { family: 'Pretendard', size: 12, weight: 'bold' },
                            color: '#2d3436'
                        },
                        ticks: {
                            suggestedMin: 0,
                            suggestedMax: 100,
                            stepSize: 20,
                            backdropColor: 'transparent',
                            display: false // 수치 숫자 표출 숨김(디자인상 깔끔하게)
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}
}
