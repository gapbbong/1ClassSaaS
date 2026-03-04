import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_KEYS = (process.env.VITE_GEMINI_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

let currentIdx = 0;
async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function callAnyGemini(prompt) {
    // 🔍 티어1 키에서 확인된 최신 모델 목록으로 업데이트
    // gemini-2.0-flash, gemini-flash-latest 순서대로 시도
    const models = ['gemini-2.0-flash', 'gemini-flash-latest'];

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

                if (res.status === 429) {
                    console.warn(`  - ${masked} 429 한도 초과. 다음 키로 이동...`);
                    break;
                }

                if (res.status === 404) {
                    const errBody = await res.json().catch(() => ({}));
                    console.warn(`  - ${masked} ${model} 에러 (${res.status}): ${errBody.error?.message || 'Not Found'}`);
                    continue;
                }

                if (res.status === 403) {
                    console.warn(`  - ${masked} 403 금지됨 (키 유출 또는 권한 없음). 차단합니다.`);
                    break;
                }

                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}));
                    throw new Error(`Status ${res.status}: ${errBody.error?.message || 'Unknown'}`);
                }

                const data = await res.json();
                if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    throw new Error("Invalid response format from Gemini");
                }

                let text = data.candidates[0].content.parts[0].text;
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const parsed = JSON.parse(text);
                return Array.isArray(parsed) ? parsed : [parsed];

            } catch (e) {
                console.warn(`  - ERROR with ${model} on ${masked}: ${e.message}`);
            }
        }

        currentIdx = (currentIdx + 1) % GEMINI_KEYS.length;
        if (currentIdx === startIdx) {
            console.error("🚨 [비상] 가용 가능한 키나 모델이 없습니다.");
            return 'STOP_ALL';
        }
    }
}

async function main() {
    console.log(`\n🚀 [무적 하이브리드 V7.1] 티어1 모델 최적화 업데이트`);

    try {
        const { data: stds } = await supabase.from('students').select('*').in('academic_year', ['2025', '2026']);
        const { data: survs } = await supabase.from('surveys').select('student_pid, data');
        const { data: exi } = await supabase.from('student_insights').select('student_pid').eq('insight_type', 'omni');

        const analyzed = new Set(exi.map(i => i.student_pid));
        const targets = stds.filter(s => survs.some(u => u.student_pid === s.pid) && !analyzed.has(s.pid));

        console.log(`🎯 남은 분석 대상: ${targets.length}명`);
        if (targets.length === 0) return console.log("🎉 모든 학생의 분석이 완료되었습니다!");

        for (let i = 0; i < targets.length; i += 3) {
            const chunk = targets.slice(i, i + 3);
            console.log(`📦 분석 진행 중 (${i + chunk.length}/${targets.length}): ${chunk.map(s => s.name).join(', ')}...`);

            const ctx = chunk.map(s => ({
                pid: s.pid,
                name: s.name,
                survey: survs.find(u => u.student_pid === s.pid)?.data || {}
            }));

            const prompt = `당신은 학생 생활 지도 전문가입니다. 다음 학생들의 설문 데이터를 분석하여 전문적인 의견을 주세요. 
            반드시 아래 필드를 포함한 JSON 배열 형식으로만 응답하세요.
            필드: pid(학생의 pid), analysis(객체 형식: summary, student_type, tags, counseling_priority, holistic_analysis, group_role, stats, detective, action 포함)
            
            데이터: ${JSON.stringify(ctx)}`;

            const results = await callAnyGemini(prompt);

            if (results === 'STOP_ALL') {
                console.log("\n🛑 지금 사용할 수 있는 키가 없습니다. 잠시 후 다시 시도하거나 키를 확인해주세요.");
                process.exit(1);
            }

            if (results && Array.isArray(results)) {
                const inserts = results
                    .filter(r => r && r.pid && r.analysis)
                    .map(r => ({
                        student_pid: r.pid,
                        insight_type: 'omni',
                        content: r.analysis
                    }));

                if (inserts.length > 0) {
                    const { error: insError } = await supabase.from('student_insights').insert(inserts);
                    if (insError) console.error("  ❌ DB 저장 오류:", insError.message);
                    else console.log(`  ✔️ ${inserts.length}명 저장 완료!`);
                } else {
                    console.warn("  ⚠️ 데이터 형식 불허로 건너뜁니다.");
                }
            }
            await sleep(5000);
        }
    } catch (e) {
        console.error("❌ 오류:", e);
    }
    console.log("\n🏁 마무리되었습니다.");
}

main();
