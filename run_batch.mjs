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
        // 1. 재분석 대상 선정 (1학년 4반 전체 + 최근 3시간 내 분석된 학생)
        const threeHoursAgo = new Date(Date.now() - (3 * 3600000)).toISOString();

        const { data: recentInsights, error: insError } = await supabase
            .from('student_insights')
            .select('student_pid')
            .eq('insight_type', 'omni')
            .gt('analyzed_at', threeHoursAgo);

        if (insError) throw new Error("분석 기록 조회 실패: " + insError.message);

        // 1학년 4반 학생들도 강제로 포함
        const { data: class4Students } = await supabase
            .from('students')
            .select('pid')
            .eq('class_info', '1-4')
            .eq('academic_year', 2026);

        const targetPidSet = new Set((recentInsights || []).map(i => i.student_pid));
        (class4Students || []).forEach(s => targetPidSet.add(s.pid));

        const targetPids = Array.from(targetPidSet);

        if (targetPids.length === 0) {
            console.log("🎯 재분석 대상자가 없습니다.");
            return;
        }

        console.log(`🎯 재분석 대상: ${targetPids.length}명 (1-4반 및 최근 분석 대상)`);

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
                  "summary": "학생의 본질을 꿰뚫는 강렬한 한 문장",
                  "student_type": "철학적이고 핵심적인 유형명",
                  "tags": ["심리태그1", "관리주의", "교우관계"],
                  "counseling_priority": 1~5,
                  "holistic_analysis": "학생의 심리/행동 양식에 대한 고도의 전문적 분석 (최소 4-5줄)",
                  "group_role": "학급 내 영향력 및 상호작용 방식",
                  "stats": {"감성": 0~100, "사교": 0~100, "성취": 0~100, "안정": 0~100},
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
