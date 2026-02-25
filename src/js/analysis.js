import { supabase } from './supabase.js';
import { extractDriveId, getThumbnailUrl } from './utils.js';

let currentStudent = null;
let currentInsight = {}; // 부분적 업데이트를 위해 객체로 관리
let currentMode = 'individual'; // 'individual' or 'class'
let currentClassInfo = null;
let analysisChart = null;

document.addEventListener("DOMContentLoaded", () => {
    initModeToggle();
    initSearch();
    initClassSelect();

    // Check URL parameters for direct student search
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get("sid");
    if (sid) {
        document.getElementById("search-id").value = sid;
        setTimeout(() => document.getElementById("search-apply-btn").click(), 100);
    }
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
                indContainer.style.display = "flex";
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

// 1. 학생 검색 기능 (학번/이름 분리)
function initSearch() {
    const idInput = document.getElementById("search-id");
    const nameInput = document.getElementById("search-name");
    const applyBtn = document.getElementById("search-apply-btn");
    const resultsDropdown = document.getElementById("search-results");

    // 이름 입력 시 실시간 드롭다운
    nameInput.addEventListener("input", async (e) => {
        const searchQuery = e.target.value.trim();
        if (searchQuery.length < 2) {
            resultsDropdown.style.display = "none";
            return;
        }

        const { data } = await supabase
            .from('students')
            .select('pid, student_id, name, class_info, gender, photo_url')
            .ilike('name', `%${searchQuery}%`)
            .limit(10);

        if (data && data.length > 0) renderSearchResults(data);
        else resultsDropdown.style.display = "none";
    });

    // 조회 버튼 클릭 및 엔터키 처리
    const handleLookup = async () => {
        const sid = idInput.value.trim();
        const sname = nameInput.value.trim();

        if (!sid && !sname) return alert("학번 또는 이름을 입력해주세요.");

        let query = supabase.from('students').select('pid, student_id, name, class_info, gender, photo_url');

        if (sid) {
            query = query.eq('student_id', sid);
        } else if (sname) {
            query = query.ilike('name', `%${sname}%`);
        }

        const { data } = await query.limit(20);

        if (!data || data.length === 0) {
            alert("검색 결과가 없습니다.");
            return;
        }

        if (data.length === 1) {
            loadStudentAnalysis(data[0].pid);
            idInput.value = "";
            nameInput.value = "";
            resultsDropdown.style.display = "none";
        } else {
            renderSearchResults(data);
        }
    };

    applyBtn.addEventListener("click", handleLookup);

    [idInput, nameInput].forEach(el => {
        el.addEventListener("keydown", (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLookup();
            }
        });
    });
}

function renderSearchResults(students) {
    const resultsDropdown = document.getElementById("search-results");
    resultsDropdown.innerHTML = students.map(s => {
        let photoUrl = "";
        const driveId = extractDriveId(s.photo_url);
        if (driveId) {
            photoUrl = getThumbnailUrl(driveId);
        } else if (s.photo_url && s.photo_url.startsWith('http')) {
            photoUrl = s.photo_url;
        } else if (s.photo_url) {
            const { data } = supabase.storage.from('student_photos').getPublicUrl(s.photo_url);
            photoUrl = data.publicUrl;
        }

        let photoHtml = photoUrl
            ? `<div style="width:32px; height:32px; border-radius:50%; background:#eee; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;"><img src="${photoUrl}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerHTML='👤'"></div>`
            : `<div style="width:32px; height:32px; border-radius:50%; background:#eee; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">👤</div>`;

        return `
            <div class="search-item" data-pid="${s.pid}" style="display:flex; align-items:center; gap:10px; padding:10px 16px;">
                ${photoHtml}
                <div>
                    <strong>${s.name}</strong> (${s.student_id})<br>
                    <small style="color:#666;">${s.class_info}</small>
                </div>
            </div>
        `;
    }).join('');
    resultsDropdown.style.display = "block";

    resultsDropdown.querySelectorAll(".search-item").forEach(item => {
        item.addEventListener("click", () => {
            loadStudentAnalysis(item.getAttribute("data-pid"));
            resultsDropdown.style.display = "none";
            document.getElementById("search-id").value = "";
            document.getElementById("search-name").value = "";
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

    // 동급생 캐싱 (이전/다음 버튼용)
    if (!window.currentClassStudents || window.currentClassStudents.length === 0 || window.currentClassStudents[0].class_info !== student.class_info) {
        const { data: classmates } = await supabase.from('students')
            .select('pid, student_id, name, class_info')
            .eq('class_info', student.class_info)
            .order('student_id', { ascending: true });
        window.currentClassStudents = classmates || [];
    }

    // 이전/다음 학생 이동 전역 함수 정의
    window.navigateAdjacentStudent = (dir) => {
        if (!currentStudent || !window.currentClassStudents) return;
        const idx = window.currentClassStudents.findIndex(s => s.pid === currentStudent.pid);
        if (idx === -1) return;
        const targetIdx = idx + dir;
        if (targetIdx >= 0 && targetIdx < window.currentClassStudents.length) {
            loadStudentAnalysis(window.currentClassStudents[targetIdx].pid);
        }
    };

    const { data: insight } = await supabase
        .from('student_insights')
        .select('*')
        .eq('student_pid', pid)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (insight) {
        document.getElementById("loading-view").style.display = "none"; // 로딩 스피너 제거
        currentInsight = insight.content;
        renderResultView();

        // 캐시 데이터 로드 시 모든 섹션을 업데이트 (데이터가 없어도 스피너 제거)
        updateSectionUI('summary', currentInsight, currentInsight.tags);
        updateSectionUI('stats', currentInsight.stats);
        updateSectionUI('detective', currentInsight.detective || {});
        updateSectionUI('action', currentInsight.action || "분석 데이터가 없습니다.");

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

    // UI 스켈레톤 렌더링 지연 (완전한 로딩바 노출을 위함)
    document.getElementById("result-view").style.display = "none";
    currentInsight = {};

    const commonContext = `
        학생: ${currentStudent.name} (${currentStudent.class_info})
        성별: ${currentStudent.gender}
        기록: ${JSON.stringify(recordsData)}
        설문: ${JSON.stringify(surveyData)}
    `;

    try {
        // AI 호출 시작 전 상태 메시지 및 프로그레스 바 시뮬레이션
        const pBar = document.getElementById("ai-progress-bar");
        const pText = document.getElementById("ai-progress-text");
        const pPercent = document.getElementById("ai-progress-percent");

        // 프로그레스 바 초기화
        let progress = 0;
        if (pBar) pBar.style.width = "0%";
        if (pText) pText.innerText = "학생 기록 및 설문 데이터 종합 중...";
        if (pPercent) pPercent.innerText = "0%";

        // 가짜 진행률 시뮬레이션 인터벌
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                // 천천히 90%까지 증가
                progress += Math.floor(Math.random() * 5) + 1;
                if (progress > 90) progress = 90;

                if (progress > 20 && progress <= 40) {
                    pText.innerText = "제미나이 2.5 Flash 모델 응답 대기 중...";
                } else if (progress > 40 && progress <= 70) {
                    pText.innerText = "다면 평가 지표 추출 및 분석 중...";
                } else if (progress > 70) {
                    pText.innerText = "거의 완료되었습니다. 결과 요약 중...";
                }

                if (pBar) pBar.style.width = `${progress}%`;
                if (pPercent) pPercent.innerText = `${progress}%`;
            }
        }, 500);

        const promptText = `
        다음 [데이터]를 바탕으로 학생의 특성을 전인적(Holistic) 관점에서 분석하여 JSON 형식으로만 답변해줘.
        JSON 이외의 텍스트(설명 등)는 절대 포함하지 마.

        {
          "summary": "학생의 전반적인 특징을 요약한 3줄 문장",
          "student_type": "학생의 핵심 성향 (1~2단어)",
          "tags": ["키워드1", "키워드2", "키워드3"],
          "counseling_priority": {
            "level": "시급/주의/관심/안정 중 택1",
            "reason": "해당 순위로 판단한 AI 소견 (1문장)"
          },
          "holistic_analysis": {
            "career": "목표지향형/탐색형/방황형 중 택1",
            "disposition": "내향 집중형/외향 활동형/균형형 중 택1",
            "family": "보호 안정형/정서 의존형/책임 조기성숙형 중 택1",
            "hobby_life": "경쟁 몰입형/창작 몰입형/소비형 중 택1",
            "rhythm": "건강 안정형/수면 부족형 중 택1",
            "emotion": "자기 인식형/고민 내재형/도움 요청형 중 택1"
          },
          "group_role": "리더형/전략가형/실행형/분위기 메이커형/자료 탐색형/책임 분산형/독주형 중 택1",
          "stats": {"study": 85, "routine": 70, "emotion": 90, "social": 80, "self": 75, "resilience": 88},
          "detective": {"clues": ["단서1", "단서2"], "deduction": "추론 의견"},
          "action": "교사를 위한 조언"
        }
        
        [데이터]
        ${commonContext}`;

        // 단 한 번의 호출로 통합 데이터 수신
        const fullData = await callGeminiAPI(apiKey, promptText, "");

        // 인터벌 정리 및 완료 상태(100%) 표시
        clearInterval(progressInterval);
        if (pBar) pBar.style.width = "100%";
        if (pText) pText.innerText = "분석 완료! 결과를 화면에 적용합니다.";
        if (pPercent) pPercent.innerText = "100%";

        currentInsight = fullData;

        // 시각적 박진감을 위해 약간의 시차를 두고 UI 업데이트
        setTimeout(() => {
            document.getElementById("loading-view").style.display = "none";
            renderResultView();
            updateSectionUI('summary', currentInsight, currentInsight.tags);
        }, 800);

        setTimeout(() => {
            updateSectionUI('stats', currentInsight.stats);
            renderChart();
        }, 300);

        setTimeout(() => {
            updateSectionUI('detective', currentInsight.detective);
        }, 600);

        setTimeout(() => {
            updateSectionUI('action', currentInsight.action);
        }, 900);

        // DB 저장
        await supabase.from('student_insights').insert([{ student_pid: pid, insight_type: 'omni', content: currentInsight }]);

    } catch (err) {
        if (typeof progressInterval !== 'undefined') clearInterval(progressInterval);
        console.error("AI Analysis Failed", err);

        const pBar = document.getElementById("ai-progress-bar");
        const pText = document.getElementById("ai-progress-text");
        if (pBar) {
            pBar.style.background = "#d63031";
            pBar.style.width = "100%";
        }
        if (pText) {
            pText.style.color = "#d63031";
            pText.innerText = "분석 실패 (API 한도/키 오류)";
        }

        const sections = ['summary', 'stats', 'detective', 'garden', 'action'];
        sections.forEach(sec => {
            const el = document.getElementById(`sec-${sec}`);
            if (el && el.classList.contains('loading-section')) {
                el.classList.remove('loading-section');
                el.innerHTML = `<h3 style="color:#d63031;">⚠️ 분석 오류</h3><p style="color:#636e72; font-size:0.9rem;">AI 연동 중 문제가 발생했습니다. (API 키 확인 필요)</p>`;
            }
        });
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

    // UI 스켈레톤 지연 처리
    document.getElementById("result-view").style.display = "none";

    const commonContext = `학급명: ${classInfo}, 데이터: ${JSON.stringify(classDataSnippet)}`;

    try {
        // AI 호출 시작 전 상태 메시지 및 프로그레스 바 시뮬레이션
        const pBar = document.getElementById("ai-progress-bar");
        const pText = document.getElementById("ai-progress-text");
        const pPercent = document.getElementById("ai-progress-percent");

        let progress = 0;
        if (pBar) pBar.style.width = "0%";
        if (pText) pText.innerText = "학급 전체 데이터 수집 및 분석 준비...";
        if (pPercent) pPercent.innerText = "0%";

        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += Math.floor(Math.random() * 5) + 1;
                if (progress > 90) progress = 90;

                if (progress > 20 && progress <= 40) {
                    pText.innerText = "제미나이 2.5 Flash 응답 대기 중...";
                } else if (progress > 40 && progress <= 70) {
                    pText.innerText = "학급 공통 특이점 및 패턴 추출 중...";
                } else if (progress > 70) {
                    pText.innerText = "거의 완료되었습니다. 결과 정리 중...";
                }

                if (pBar) pBar.style.width = `${progress}%`;
                if (pPercent) pPercent.innerText = `${progress}%`;
            }
        }, 500);
        const promptText = `
        다음 학급 [데이터]를 분석하여 JSON 형식으로만 답변해줘. 다른 설명 없이 오직 JSON만 출력해.
        {
          "summary": "학급 전체 분위기 요약 (3줄)",
          "tags": ["태그1", "태그2", "태그3"],
          "detective": {"clues": ["공통 패턴1", "공통 패턴2"], "deduction": "학급 전체 해석"},
          "garden": {"species": "숲/정원 비유 이름", "condition": "운영 제안"},
          "action": "교사 팁"
        }
        [데이터]
        ${commonContext}`;

        const fullData = await callGeminiAPI(apiKey, promptText, "");

        clearInterval(progressInterval);
        if (pBar) pBar.style.width = "100%";
        if (pText) pText.innerText = "학급 분석 완료! 화면을 구성합니다.";
        if (pPercent) pPercent.innerText = "100%";

        setTimeout(() => {
            document.getElementById("loading-view").style.display = "none";
            renderResultView();
            updateSectionUI('summary', fullData.summary, fullData.tags);
            updateSectionUI('detective', fullData.detective);
            updateSectionUI('garden', fullData.garden);
            updateSectionUI('action', fullData.action);
        }, 800);
    } catch (e) {
        if (typeof progressInterval !== 'undefined') clearInterval(progressInterval);
        console.error("Class Analysis Error", e);
        const sections = ['summary', 'detective', 'garden', 'action'];
        sections.forEach(sec => {
            const el = document.getElementById(`sec-${sec}`);
            if (el && el.classList.contains('loading-section')) {
                el.classList.remove('loading-section');
                el.innerHTML = `<h3 style="color:#d63031;">⚠️ 분석 오류</h3><p style="color:#636e72; font-size:0.9rem;">학급 분석 중 오류가 발생했습니다.</p>`;
            }
        });
    }
}

// Helper: Call Gemini
async function callGeminiAPI(apiKey, prompt, context) {
    // 사용자의 최신 환경에 맞춰 Gemini 2.5 Flash 모델로 업데이트
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: (context ? context + "\n" : "") + prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });
        const res = await response.json();
        if (res.error) throw new Error(res.error.message);
        if (!res.candidates || !res.candidates[0].content.parts[0].text) throw new Error("AI 응답 형식이 올바르지 않습니다.");

        let text = res.candidates[0].content.parts[0].text;

        // 마크다운 백틱 제거 및 순수 JSON 추출
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(text);
    } catch (err) {
        console.error("Gemini API Call Error:", err);
        throw err;
    }
}

// UI: Initial Result View (Skeleton)
function renderResultView() {
    document.getElementById("result-view").style.display = "block";
    const photoMini = document.getElementById("student-photo-mini");
    const headerName = document.getElementById("view-student-name");
    const headerInfo = document.getElementById("view-student-info");

    if (currentStudent) {
        headerName.innerText = currentStudent.name;
        headerInfo.innerText = `${currentStudent.student_id || ''}`.trim();

        // 사진 처리 로직 개선 (Drive ID 지원)
        let photoUrl = "";
        const driveId = extractDriveId(currentStudent.photo_url);
        if (driveId) {
            photoUrl = getThumbnailUrl(driveId);
        } else if (currentStudent.photo_url && currentStudent.photo_url.startsWith('http')) {
            photoUrl = currentStudent.photo_url;
        } else if (currentStudent.photo_url) {
            const { data } = supabase.storage.from('student_photos').getPublicUrl(currentStudent.photo_url);
            photoUrl = data.publicUrl;
        }

        if (photoUrl) {
            photoMini.innerHTML = `<img src="${photoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.src='https://ovpcrjovaypvnstzptvi.supabase.co/storage/v1/object/public/student_photos/default-avatar.png'; this.onerror=null; this.parentElement.innerHTML='👤';">`;
        } else {
            photoMini.innerHTML = "👤";
        }
    } else {
        headerName.innerText = `${currentClassInfo} 학급 전체`;
        headerInfo.innerText = "통합 분석";
        photoMini.innerHTML = "🏫";

        // 학급 전체 모드일 때는 이동 버튼 및 클릭 숨김 (css/js 제어)
        const prevBtn = document.getElementById("prev-student-btn");
        const nextBtn = document.getElementById("next-student-btn");
        if (prevBtn) prevBtn.style.visibility = "hidden";
        if (nextBtn) nextBtn.style.visibility = "hidden";
        const linkDiv = document.getElementById("student-profile-link");
        if (linkDiv) linkDiv.style.cursor = "default";
    }

    // 개별 학생 모드일 때만 이동 버튼 활성화
    if (currentStudent && window.currentClassStudents && window.currentClassStudents.length > 0) {
        const idx = window.currentClassStudents.findIndex(s => s.pid === currentStudent.pid);
        const prevBtn = document.getElementById("prev-student-btn");
        const nextBtn = document.getElementById("next-student-btn");
        const linkDiv = document.getElementById("student-profile-link");

        if (prevBtn) {
            prevBtn.style.visibility = idx > 0 ? "visible" : "hidden";
            prevBtn.onclick = () => window.navigateAdjacentStudent(-1);
        }
        if (nextBtn) {
            nextBtn.style.visibility = idx < window.currentClassStudents.length - 1 ? "visible" : "hidden";
            nextBtn.onclick = () => window.navigateAdjacentStudent(+1);
        }
        if (linkDiv) {
            linkDiv.style.cursor = "pointer";
            linkDiv.onclick = () => {
                window.location.href = `record.html?num=${currentStudent.student_id || ''}&name=${encodeURIComponent(currentStudent.name)}`;
            };
        }
    }

    document.getElementById("lens-content").innerHTML = `
        <div id="sec-counseling" style="margin-bottom: 25px;"></div>
        <div id="sec-summary" class="result-card loading-section"><h3>⭐ AI 핵심 요약</h3><div class="mini-spinner"></div><p class="status-text">분석 중...</p></div>
        <div id="sec-profile" class="result-card loading-section"><h3>🌈 전인적 분석 프로파일</h3><div class="mini-spinner"></div></div>
        <div id="sec-stats" class="result-card loading-section" style="${currentMode === 'class' ? 'display:none' : ''}"><h3>📊 다면 평가 수치</h3><div class="mini-spinner"></div></div>
        <div id="sec-detective" class="result-card loading-section"><h3>🕵️ 특이점 추론</h3><div class="mini-spinner"></div></div>
        <div id="sec-action" class="result-card loading-section"><h3>💡 추천 액션 플랜</h3><div class="mini-spinner"></div></div>
        
        <!-- 새로운 분석 시작 버튼 추가 (하단) -->
        <div style="margin-top: 30px; text-align: center;">
            <button id="re-analyze-btn" class="action-btn" style="width: 100%; padding: 18px; font-size: 1.1rem; border-radius: 16px; box-shadow: 0 4px 12px rgba(74, 144, 226, 0.2);">
                ✨ 최신 데이터로 새로운 분석 시작
            </button>
            <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 10px;">기존 분석 데이터가 있더라도 실시간 기록을 바탕으로 다시 분석합니다.</p>
        </div>
    `;

    // 재분석 버튼 이벤트 리스너
    const reBtn = document.getElementById("re-analyze-btn");
    if (reBtn) {
        reBtn.onclick = () => {
            if (currentStudent && confirm(`${currentStudent.name} 학생의 최신 기록을 바탕으로 다시 분석을 시작할까요?`)) {
                runBatchAIAnalysis(currentStudent.pid);
            } else if (!currentStudent && currentClassInfo) {
                // 학급 전체 모드는 일단 보류하거나 필요시 구현
            }
        };
    }
}

// UI: Update specific section
function updateSectionUI(type, data, extra) {
    const el = document.getElementById(`sec-${type}`);
    if (!el) return;
    el.classList.remove('loading-section');

    switch (type) {
        case 'summary':
            let summaryText = "";
            let studentType = "";

            if (typeof data === 'string') {
                summaryText = data;
            } else if (data && typeof data === 'object') {
                summaryText = data.summary || data.text || "";
                studentType = data.student_type || "";
            }

            const typeBadgeHtml = studentType ? `<div style="margin-top: 10px; margin-bottom: 12px;"><span style="background:linear-gradient(135deg, #FF9A9E, #FECFEF); color:#D81B60; padding:6px 12px; border-radius:20px; font-size:0.95rem; font-weight:800; border:1px solid #FF80AB; display:inline-flex; align-items:center; gap:6px;">✨ ${studentType}</span></div>` : '';
            el.innerHTML = `<h3 style="color:#4A90E2; margin-top:0;">⭐ AI 핵심 요약</h3>
                            ${typeBadgeHtml}
                            <p style="font-size:1.05rem; line-height:1.7; word-break:keep-all; color:#333; background:#f8fafc; padding:16px; border-radius:12px; margin:0 0 12px 0;">${summaryText}</p>
                            <div>${(extra || []).map(t => `<span class="badge" style="background:var(--ai-primary); color:white; padding:4px 8px; border-radius:4px; font-size:0.85rem; margin-right:6px;">#${t}</span>`).join('')}</div>`;

            // 상담 시급도 및 프로파일 자동 렌더링 호출
            renderCounselingPriority(data.counseling_priority);
            renderHolisticProfile(data.holistic_analysis, data.group_role);
            break;
        case 'stats':
            el.innerHTML = `<h3 style="color:#4A90E2; margin-top:0;">📊 다면 평가 수치</h3>
                            <div style="height:300px; display:flex; justify-content:center; align-items:center; background:#f8fafc; border-radius:12px; padding:10px;"><canvas id="aiStatsChart"></canvas></div>`;
            break;
        case 'detective':
            if (!data || !data.clues) {
                el.innerHTML = `<h3 style="color:#D35400; margin-top:0;">🕵️ 특이점 추론 (Detective)</h3><p style="padding:10px; color:#94a3b8;">데이터가 없습니다.</p>`;
                break;
            }
            el.innerHTML = `<h3 style="color:#D35400; margin-top:0;">🕵️ 특이점 추론 (Detective)</h3>
                            <div style="background:#fdf6e3; padding:16px; border-radius:12px; border-left:4px solid #D35400; font-size:0.95rem; line-height:1.6; color:#444; word-break:keep-all;">
                                <p style="font-weight:bold; margin:0 0 8px 0; color:#D35400;">발견된 단서 (Clues)</p>
                                <ul style="margin:0 0 12px 0; padding-left:24px; color:#555; word-break:keep-all;">${(data.clues || []).map(c => `<li style="margin-bottom:4px;">${c}</li>`).join('')}</ul>
                                <p style="margin:12px 0 4px 0; font-weight:bold; border-top:1px dashed #ccc; padding-top:10px; color:#D35400;">추론 결과</p>
                                <p style="margin:0; word-break:keep-all;">${data.deduction}</p>
                            </div>`;
            break;
        case 'action':
            el.innerHTML = `<h3 style="color:var(--ai-primary); margin-top:0;">💡 교사를 위한 추천 액션 플랜</h3>
                            <p style="font-size:1.05rem; font-weight:bold; word-break:keep-all; color:#333; line-height:1.7; background:#eef2ff; padding:16px; border-radius:12px; margin:0; border:1px solid #cce4f7;">${data || "추천 액션이 없습니다."}</p>`;
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
    // 차트 레이블 설정 (크고 진하게)
    analysisChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['학업', '루틴', '정서', '사회성', '자아성찰', '회복탄력성'],
            datasets: [{
                label: 'AI 분석',
                data: [s.study, s.routine, s.emotion, s.social, s.self, s.resilience],
                backgroundColor: 'rgba(74, 144, 226, 0.2)',
                borderColor: '#4A90E2',
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                r: {
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: { display: false },
                    pointLabels: {
                        font: {
                            size: 22, // 기존보다 약 2~3배 확대 (충분히 크게)
                            weight: '900', // 더 두껍게
                            family: 'Pretendard'
                        },
                        color: '#1e293b'
                    }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 상담 시급도 배너 렌더링
function renderCounselingPriority(priority) {
    const el = document.getElementById("sec-counseling");
    if (!el) return;
    if (!priority) {
        el.innerHTML = "";
        return;
    }

    const levels = [
        { id: '시급', color: '#e11d48', icon: '🔴' },
        { id: '주의', color: '#ea580c', icon: '🟠' },
        { id: '관심', color: '#ca8a04', icon: '🟡' },
        { id: '안정', color: '#16a34a', icon: '🟢' }
    ];

    const currentLevel = priority.level;
    const bgInfo = {
        '시급': { bg: '#fff1f2', border: '#fda4af' },
        '주의': { bg: '#fff7ed', border: '#fdba74' },
        '관심': { bg: '#fefce8', border: '#fef08a' },
        '안정': { bg: '#f0fdf4', border: '#bbf7d0' }
    };
    const highlight = bgInfo[currentLevel] || bgInfo['안정'];

    let html = `
        <div style="background:${highlight.bg}; border:2px solid ${highlight.border}; border-radius:16px; padding:18px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:10px; flex-wrap:wrap; gap:10px;">
                <div style="font-weight:800; color:#1e293b; font-size:1rem;">상담 시급도</div>
                <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.5); padding:4px 12px; border-radius:20px; border:1px solid rgba(0,0,0,0.03);">
    `;

    levels.forEach((lvl, index) => {
        const isActive = lvl.id === currentLevel;
        html += `
            <span style="font-size:0.95rem; display:flex; align-items:center; gap:4px; ${isActive ? `color:${lvl.color}; font-weight:900;` : 'color:#94a3b8; font-weight:400;'}">
                ${isActive ? lvl.icon : ''} ${lvl.id}
            </span>
            ${index < levels.length - 1 ? '<span style="color:#cbd5e1; margin:0 2px; font-weight:100;">/</span>' : ''}
        `;
    });

    html += `
                </div>
            </div>
            <div style="color:#475569; font-size:0.95rem; line-height:1.5;">
                <span style="display:inline-block; background:${highlight.border}; color:#fff; padding:2px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; margin-right:6px; vertical-align:middle;">AI 소견</span>
                <span style="vertical-align:middle;">${priority.reason}</span>
            </div>
        </div>
    `;

    el.innerHTML = html;
}

// 전인적 프로파일 및 모둠 역할 렌더링
function renderHolisticProfile(analysis, role) {
    const el = document.getElementById("sec-profile");
    if (!el) return;
    el.classList.remove('loading-section');

    if (!analysis) {
        el.innerHTML = `<h3 style="color:#94a3b8; margin-top:0;">🌈 전인적 분석 프로파일</h3>
                <p style="color:#94a3b8; font-size:0.9rem; text-align:center; padding:20px; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1;">구버전 분석 데이터입니다. 새로운 분석을 실행하면 전인적 프로파일이 표시됩니다.</p>`;
        return;
    }

    const config = [
        { key: 'career', label: '🎯 학습 동기 & 진로', items: ['목표지향형', '탐색형', '방황형'] },
        { key: 'disposition', label: '🧠 성향 & 에너지', items: ['내향 집중형', '외향 활동형', '균형형'] },
        { key: 'family', label: '🏠 가정 환경 기반', items: ['보호 안정형', '정서 의존형', '책임 조기성숙형'] },
        { key: 'hobby_life', label: '🎮 몰입 에너지', items: ['경쟁 몰입형', '창작 몰입형', '소비형'] },
        { key: 'rhythm', label: '🌙 생활 리듬', items: ['건강 안정형', '수면 부족형'] },
        { key: 'emotion', label: '💛 정서 유형', items: ['자기 인식형', '고민 내재형', '도움 요청형'] }
    ];

    let html = '<h3 style="color:#4A90E2; margin-top:0;">🌈 전인적 분석 프로파일</h3>';
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:15px;">';

    config.forEach(cfg => {
        const selected = analysis[cfg.key];
        html += `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:12px;">
                <div style="font-size:0.85rem; color:#64748b; margin-bottom:8px;">${cfg.label}</div>
                <div style="display:flex; flex-wrap:wrap; gap:6px;">
                    ${cfg.items.map(item => {
            const isActive = item === selected;
            return `<span style="padding:4px 10px; border-radius:8px; font-size:0.9rem; ${isActive ? 'background:#4A90E2; color:#fff; font-weight:bold; box-shadow:0 2px 4px rgba(74,144,226,0.3);' : 'background:#f1f5f9; color:#94a3b8;'}">${item}</span>`;
        }).join('')}
                </div>
            </div>
        `;
    });
    html += '</div>';

    if (role) {
        html += `
            <div style="margin-top:20px; background:linear-gradient(to right, #f0f7ff, #fdf2f8); border-radius:12px; padding:16px; border:1px solid #bae6fd;">
                <div style="font-weight:bold; color:#0369a1; margin-bottom:8px;">👥 모둠 활동 추천 역할</div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="background:#0369a1; color:#fff; padding:4px 12px; border-radius:20px; font-weight:bold;">${role}</span>
                    <span style="color:#0c4a6e; font-size:0.95rem;">활동 시 위 역할을 맡을 때 가장 높은 시너지를 낼 수 있습니다.</span>
                </div>
            </div>
        `;
    }

    el.innerHTML = html;
}
