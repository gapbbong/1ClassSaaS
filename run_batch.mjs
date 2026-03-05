import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_KEYS = (process.env.VITE_GEMINI_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

let currentIdx = 0;
async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function callSharpGemini(prompt) {
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
    let startIdx = currentIdx;

    while (true) {
        let apiKey = GEMINI_KEYS[currentIdx];
        const masked = `[${apiKey.slice(-4)}]`;

        for (const model of models) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                if (res.status === 429) break;
                if (!res.ok) continue;

                const data = await res.json();
                let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) continue;

                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const parsed = JSON.parse(text);
                return Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                console.warn(`  - Model ${model} fail: ${e.message}`);
            }
        }

        currentIdx = (currentIdx + 1) % GEMINI_KEYS.length;
        if (currentIdx === startIdx) return 'STOP_ALL';
    }
}

async function main() {
    console.log(`\n🔥 [날카로운 심화 분석 모드 V12.1] 실행 중...`);

    try {
        // 1. 모든 학생 조회
        const { data: allStudents } = await supabase
            .from('students')
            .select('pid')
            .eq('academic_year', 2026);

        const allPids = allStudents.map(s => s.pid);

        // 2. 가장 최근 분석 내역들 조회
        const { data: allInsights } = await supabase
            .from('student_insights')
            .select('student_pid, content')
            .eq('insight_type', 'omni')
            .order('analyzed_at', { ascending: false });

        const targetPidSet = new Set();

        for (const student of allStudents) {
            const latestInsight = allInsights.find(i => i.student_pid === student.pid);

            if (!latestInsight) {
                targetPidSet.add(student.pid);
            } else {
                const content = latestInsight.content;
                const hasStats = content && content.stats && typeof content.stats === 'object' && Object.keys(content.stats).length > 0;
                const hasHolistic = content && content.holistic_analysis && typeof content.holistic_analysis === 'object' && Object.keys(content.holistic_analysis).length > 0;

                if (!hasStats || !hasHolistic) {
                    targetPidSet.add(student.pid);
                }
            }
        }

        const targetPids = Array.from(targetPidSet);

        if (targetPids.length === 0) {
            console.log("🎯 모든 학생이 최신 버전으로 분석되어 있습니다.");
            return;
        }

        console.log(`🎯 재분석 대상: ${targetPids.length}명 (최신 지표 누락 또는 미분석)`);

        // 2. 데이터 벌크 로드
        const { data: stds } = await supabase.from('students').select('*').in('pid', targetPids);
        const { data: survs } = await supabase.from('surveys').select('student_pid, data');
        const { data: recs } = await supabase.from('life_records').select('student_pid, category, content, is_positive');

        for (let i = 0; i < stds.length; i += 2) {
            const chunk = stds.filter(s => survs.some(u => u.student_pid === s.pid)).slice(i, i + 2);
            if (chunk.length === 0) continue;

            console.log(`💉 심화 분석 중 (${Math.min(i + 2, stds.length)}/${stds.length}): ${chunk.map(s => s.name).join(', ')}...`);

            const ctx = chunk.map(s => {
                const sv = survs.find(u => u.student_pid === s.pid)?.data || {};
                const lr = recs.filter(r => r.student_pid === s.pid).map(r => `[${r.category}] ${r.content}`).join('\n');

                return {
                    pid: s.pid,
                    name: s.name,
                    gender: s.gender,
                    class: s.class_info,
                    survey: sv,
                    life_records: lr || "기록 없음"
                };
            });

            const prompt = `당신은 20년 경력의 베테랑 상담 교사입니다. 학생의 [기초조사]와 [생활기록]을 바탕으로, 이 학생의 성격, 잠재력, 그리고 교사가 주의깊게 살펴야 할 심리적 포인트를 "날카롭고 전문적으로" 분석하세요.
            
            분석 지침:
            - "착하고 성실함" 같은 뻔한 말은 절대 쓰지 마세요. 
            - 학생이 설문에서 사용한 단어나 문장 스타일에서 느껴지는 심리적 기제(예: 인정 욕구, 회피 성향, 학업 스트레스, 가정 내 결핍 등)를 찾아내세요.
            - 'detective' 항목: "설문에서 ~라고 답한 것은 사실 ~한 심리를 내포하고 있음"과 같은 추론을 포함하세요.
            - 'action' 항목: 교사가 이 학생의 마음을 얻기 위해 건네야 할 첫 마디나 구체적 보상/지도법을 제시하세요.
            
            반드시 JSON 배열 형식으로만 응답하세요.

            형식:
            [
              {
                "pid": "학생pid",
                "analysis": {
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
                  "detective": {"clues": ["실제 답변 내용"], "deduction": "답변 이면의 심리적 통찰"},
                  "action": "교사를 위한 실전적 밀착 지도 팁"
                }
              }
            ]

            데이터: ${JSON.stringify(ctx)}`;

            const results = await callSharpGemini(prompt);
            if (results === 'STOP_ALL') break;

            if (results && Array.isArray(results)) {
                for (const r of results) {
                    if (!r.pid || !r.analysis) continue;

                    // 1. 기존 분석 삭제
                    await supabase
                        .from('student_insights')
                        .delete()
                        .eq('student_pid', r.pid)
                        .eq('insight_type', 'omni');

                    // 2. 새 분석 삽입
                    const { error: insError } = await supabase
                        .from('student_insights')
                        .insert({
                            student_pid: r.pid,
                            insight_type: 'omni',
                            content: r.analysis,
                            analyzed_at: new Date().toISOString()
                        });

                    if (insError) console.error(`  ❌ ${r.pid} 저장 실패:`, insError.message);
                }
                console.log(`  ✔️ ${results.length}명 업데이트 완료`);
            }
            await sleep(3000); // API 레이트 리밋 방지
        }
    } catch (e) {
        console.error("❌ 오류:", e);
    }
    console.log("\n🏁 심화 분석이 완료되었습니다.");
}

main();
