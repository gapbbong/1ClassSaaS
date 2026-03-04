import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// .env 파일의 환경설정을 로드합니다.
dotenv.config();

// ==== 1. API 키 설정 ====
const GEMINI_KEYS = (process.env.VITE_GEMINI_API_KEYS || process.env.VITE_GEMINI_API_KEY || "")
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);


const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// ==== 분석 엔진 핵심 로직 ====
let currentKeyIndex = 0;

function getCurrentKey() {
    return GEMINI_KEYS[currentKeyIndex];
}

function rotateKey() {
    currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
    console.log(`\n🔄 [Key Rotation] ${currentKeyIndex + 1}번째 계정으로 전환합니다.`);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini(promptText, retries = 5) {
    const model = 'gemini-1.5-flash'; // 2.0 보다 할당량이 안정적인 1.5 Flash로 전환

    for (let i = 1; i <= retries; i++) {
        let keysAttemptedInThisTurn = 0;

        while (keysAttemptedInThisTurn < GEMINI_KEYS.length) {
            const apiKey = getCurrentKey();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }]
                    })
                });

                if (response.status === 429) {
                    console.warn(`\n⚠️ 429 할당량 초과 (Account ${currentKeyIndex + 1}/${GEMINI_KEYS.length})`);
                    keysAttemptedInThisTurn++;

                    if (keysAttemptedInThisTurn < GEMINI_KEYS.length) {
                        rotateKey();
                        console.log(`-> 안전을 위해 60초간 숨을 고른 뒤 다음 계정으로 재시도합니다...`);
                        await sleep(60000);
                        continue;
                    } else {
                        const waitTime = 600000; // 10분으로 약간 단축하되 더 자주 체크
                        console.error(`\n🚨 모든 계정의 한도가 일시적으로 막혔습니다.`);
                        console.error(`🚨 10분간 분석 마라톤을 중단하고 휴식 모드에 진입합니다...`);
                        await sleep(waitTime);
                        rotateKey();
                        keysAttemptedInThisTurn = 0;
                        continue;
                    }
                }

                if (!response.ok) {
                    const errResult = await response.text();
                    throw new Error(`API Error: ${response.status} - ${errResult}`);
                }

                const data = await response.json();
                if (!data.candidates || !data.candidates[0].content.parts[0].text) {
                    throw new Error("응답 형식 오류");
                }

                let text = data.candidates[0].content.parts[0].text;
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const parsed = JSON.parse(text);

                if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) {
                    throw new Error("파싱된 결과가 비어있습니다.");
                }
                return parsed;

            } catch (error) {
                console.error(`\n❌ Gemini API 오류 (${i}/${retries}):`, error.message);
                if (i === retries) throw error;
                console.log(`-> 30초 후 안전한 재시도를 진행합니다...`);
                await sleep(30000);
                break;
            }
        }
    }
    throw new Error("시스템 안정을 위해 분석을 잠시 중단합니다.");
}


async function main() {
    console.log("\n==================================================");
    console.log("🚀 백그라운드 AI 분석 엔진 (안정화 모드 V3.3) 가동");
    console.log(`-> 연동된 API 계정: ${GEMINI_KEYS.length}개`);
    console.log("==================================================\n");

    try {
        const { data: students, error: err1 } = await supabase.from('students').select('*').eq('academic_year', '2026');
        const { data: surveys, error: err2 } = await supabase.from('surveys').select('student_pid, data');
        const { data: insights, error: err3 } = await supabase.from('student_insights').select('student_pid');
        const { data: allRecords, error: err4 } = await supabase.from('life_records').select('*');

        if (err1 || err2 || err3 || err4) throw new Error("DB 정보 조회 실패");

        const submissionSet = new Set(surveys.map(s => s.student_pid));
        const analyzedSet = new Set(insights.map(i => i.student_pid));

        const targetStudents = students.filter(s => submissionSet.has(s.pid) && !analyzedSet.has(s.pid));

        console.log(`📊 기초조사 수집 완료: ${submissionSet.size}명`);
        console.log(`🎯 이번 분석 정복 대상: ${targetStudents.length}명\n`);

        if (targetStudents.length === 0) {
            console.log("🎉 축하합니다! 모든 학생의 심층 분석이 완료되었습니다.");
            return;
        }

        const CHUNK_SIZE = 2;
        for (let i = 0; i < targetStudents.length; i += CHUNK_SIZE) {
            const chunk = targetStudents.slice(i, i + CHUNK_SIZE);
            const names = chunk.map(s => s.name).join(', ');

            console.log(`📦 [섹션 ${Math.floor(i / CHUNK_SIZE) + 1}] 분석 진행 중: ${names}`);

            const studentsContext = chunk.map(student => {
                const rawSurvey = surveys.find(s => s.student_pid === student.pid)?.data || {};

                // 데이터 다이어트: 분석에 불필요한 개인정보 항목 제거하여 토큰 절약
                const cleanSurvey = { ...rawSurvey };
                ['입력시간', '비밀번호', '학생폰', '주보호자연락처', '보조보호자연락처', '집주소', '상세주소'].forEach(k => delete cleanSurvey[k]);

                const records = allRecords
                    .filter(r => r.student_pid === student.pid && r.content && r.content.trim().length > 5)
                    .map(r => ({ category: r.category, content: r.content }));

                return {
                    pid: student.pid,
                    name: student.name,
                    gender: student.gender,
                    survey: cleanSurvey,
                    records
                };
            });

            const promptText = `
다음 학생들의 정보를 개별적으로 정밀 분석하여 JSON 배열 형식으로 답변하세요.
데이터: ${JSON.stringify(studentsContext)}

분석 방향:
1. 학생의 장단점 및 특이사항 발견
2. 선생님이 유의해서 보아야 할 생활지도 포인트 추출
3. 전체적인 심리 상태 및 태도 요약

반드시 아래 형식의 JSON 배열로만 답변하세요:
[{"pid": "학생의 pid", "analysis": {"summary": "...", "student_type": "...", "tags": ["..."], "attitude": "...", "needs_care": boolean}}]
`;

            try {
                const batchResults = await callGemini(promptText);

                if (!Array.isArray(batchResults)) throw new Error("데이터 형식이 올바르지 않습니다.");

                const insertData = batchResults.map(res => ({
                    student_pid: res.pid,
                    insight_type: 'omni',
                    content: res.analysis
                })).filter(d => d.student_pid && d.content);

                const { error: insertErr } = await supabase.from('student_insights').insert(insertData);
                if (insertErr) throw insertErr;

                console.log(`  ✔️ ${insertData.length}명 분석 완료!`);

                if (i + CHUNK_SIZE < targetStudents.length) {
                    console.log(`  ⏳ 다음 호출까지 70초간 평화를 유지합니다... (할당량 방어용)`);
                    await sleep(70000);
                }

            } catch (err) {
                console.error(`  ❌ 진행 중 일시적 오류:`, err.message);
                console.log(`  ⏳ 시스템 안정을 위해 2분간 대기 후 계속합니다...`);
                await sleep(120000);
            }
        }

        console.log(`\n==================================================`);
        console.log(`🎊 모든 분석 마라톤을 완주했습니다! 🎊`);
        console.log(`==================================================\n`);

    } catch (error) {
        console.error("Critical Error:", error);
    }
}

main();
