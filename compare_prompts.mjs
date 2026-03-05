import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const GEMINI_KEYS = process.env.VITE_GEMINI_API_KEYS.split(',').map(k => k.trim());
const targetModel = 'gemini-2.5-flash';

async function callGemini(promptText) {
    const apiKey = GEMINI_KEYS[1]; // 두 번째 키 사용
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });

    const data = await response.json();
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(text);
}

async function main() {
    // 1. 이미 분석된 학생 2명 무작위 또는 최상단에서 추출
    const { data: insights } = await supabase.from('student_insights').select('student_pid, content').order('analyzed_at', { ascending: true }).limit(2);

    if (!insights || insights.length < 2) {
        console.log("Not enough analyzed students found.");
        return;
    }

    for (const insight of insights) {
        const pid = insight.student_pid;
        const oldContent = insight.content;

        const { data: student } = await supabase.from('students').select('*').eq('pid', pid).single();
        const { data: survey } = await supabase.from('surveys').select('data').eq('student_pid', pid).single();
        const { data: records } = await supabase.from('life_records').select('*').eq('student_pid', pid);

        const cleanSurvey = { ...(survey?.data || {}) };
        ['입력시간', '비밀번호', '학생폰', '주보호자연락처', '보조보호자연락처', '집주소', '상세주소'].forEach(k => delete cleanSurvey[k]);

        const cleanRecords = records.filter(r => r.content && r.content.trim().length > 5).map(r => ({ category: r.category, content: r.content }));

        const studentContext = [{
            pid: student.pid,
            name: student.name,
            gender: student.gender,
            survey: cleanSurvey,
            records: cleanRecords
        }];

        // 3. 고도화된 프롬프트 적용
        const promptText = `
다음 학생들의 정보를 개별적으로 정밀 분석하여 '전문 심리상담가 및 10년 차 베테랑 교사' 수준의 입체적이고 날카로운 통찰을 담아 JSON 배열 형식으로 답변해줘.

[분석 방향 및 지침]
1. 단순 칭찬, 피상적(비슷비슷한) 요약을 철저히 배제하고, 학생의 개별 데이터에 기반한 매우 구체적이고 전문적인 분석을 할 것.
2. 예전 학년의 교사 관찰(life_records)과 올해 학생 본인의 응답(survey)을 교차 검증하여, 둘 사이의 간극(예: 과거엔 쾌활했으나 최근 무기력함)이나 숨겨진 모순점, 잠재적 교육 리스크를 예리하게 짚어낼 것.
3. 'detective' 항목은 표면적인 현상 뒤에 있는 근본적 원인(가정환경, 정서결핍, 완벽주의 등)을 추론하고, 'action' 란에는 교사가 당장 내일 써먹을 수 있는 "실천적/구체적인 넛지(Nudge) 방법"을 조언할 것.

데이터: ${JSON.stringify(studentContext)}

반드시 아래 형식의 JSON 배열로만 답변해 (텍스트, 마크다운 코드블록 절대 금지):
[
  {
    "pid": "학생의 pid",
    "analysis": {
      "summary": "핵심 기질, 현재 상태, 잠재력을 관통하는 예리하고 전문적인 3줄 요약",
      "student_type": "핵심 성향 (예: 완벽주의 성향의 탐구자, 응축된 에너지를 가진 관찰자 등 창의적 수식)",
      "tags": ["전문성_느껴지는_특징1", "심리상태_키워드2", "태도_키워드3"],
      "counseling_priority": {
        "level": "시급/주의/관심/안정 중 택1",
        "reason": "해당 판단을 내린 구체적인 교육학적/심리학적 근거 (1문장)"
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
      "stats": {"study": 80, "routine": 70, "emotion": 90, "social": 85, "self": 75, "resilience": 88},
      "detective": {
        "clues": ["과거 기록과 현재 설문의 미세한 불일치점 등 단서1", "특정 단어 반복 등장 등 단서2"],
        "deduction": "이러한 파편적 단서들을 조합해 추출한 행동 패턴의 심층적/심리적 원인"
      },
      "action": "뻔한 멘트가 아닌, 이 학생과 다가가기 위해 당장 써먹을 수 있는 아주 구체적인 교수법/라포형성 팁(예: 공개 칭찬보다는 개인적 메모로 지지 표현하기)"
    }
  }
]
`;

        const newResultArray = await callGemini(promptText);
        const newResult = newResultArray[0].analysis;

        console.log(`\n======================================================`);
        console.log(`👤 학생명: ${student.name} (${student.class_info})`);
        console.log(`======================================================\n`);

        console.log(`[ 🔹 이전 프롬프트 분석 결과 (Before) ]`);
        console.log(`- 요약 (Summary):\n  ${oldContent.summary?.replace(/\\n/g, '\n  ') || ''}`);
        console.log(`- 학생 유형 (Type): ${oldContent.student_type || 'N/A'}`);
        console.log(`- 단서 추론 (Detective):\n  [단서] ${(oldContent.detective?.clues || []).join(', ')}\n  [추론] ${oldContent.detective?.deduction || ''}`);
        console.log(`- 액션 플랜 (Action):\n  ${oldContent.action || ''}`);

        console.log(`\n------------------------------------------------------\n`);

        console.log(`[ 🚀 베테랑 프롬프트 분석 결과 (After) ]`);
        console.log(`- 요약 (Summary):\n  ${newResult.summary.replace(/\\n/g, '\n  ')}`);
        console.log(`- 학생 유형 (Type): ${newResult.student_type}`);
        console.log(`- 단서 추론 (Detective):\n  [단서] ${(newResult.detective?.clues || []).join(', ')}\n  [추론] ${newResult.detective.deduction}`);
        console.log(`- 액션 플랜 (Action):\n  ${newResult.action}`);
    }
    console.log(`\n================ 비교 종료 ================`);
}

main().catch(console.error);
