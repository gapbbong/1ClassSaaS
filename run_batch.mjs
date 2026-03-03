import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// .env 파일의 환경설정을 로드합니다.
dotenv.config();

// ==== 1. API 키 설정 ("돌려막기"용) ====
// 발급받으신 여러 개의 키를 따옴표('') 안에 쉼표로 구분해서 자유롭게 추가하세요.
const GEMINI_KEYS = [
    process.env.VITE_GEMINI_API_KEY, // 첫 번째는 .env 기본 키를 사용합니다.
    'AIzaSyDusECCC5xy6DVcGToRCFKcLZSZ-SjKiJ8',
].filter(Boolean); // 빈 값은 자동으로 무시합니다.

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// ==== 아래부터는 분석 엔진 핵심 로직입니다 ====
let currentKeyIndex = 0;

function getCurrentKey() {
    return GEMINI_KEYS[currentKeyIndex];
}

function rotateKey() {
    currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
    console.log(`\n🔄 [API Key Changed] 다음 키로 교체되었습니다. (현재 ${currentKeyIndex + 1}번째 키 사용 중)`);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini(promptText, retries = 3) {
    const model = 'gemini-2.5-flash'; // 최적화된 최신 2.5 flash 고정

    for (let i = 0; i < retries; i++) {
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
                console.warn(`\n⚠️ 429 할당량 초과 발생! (사용된 키: ${apiKey.substring(0, 15)}...)`);
                if (GEMINI_KEYS.length > 1) {
                    rotateKey(); // 키 변경
                    console.log(`-> 바로 다음 키로 즉시 재시도합니다...`);
                    continue; // 반복문의 다음 턴(i 안 오름)이 아닌, 재시도를 위해 명시적으로 i 차감 X. i는 소모됨
                } else {
                    console.warn(`-> 등록된 키가 1개뿐입니다. 구글 제한이 풀리길 60초간 기다립니다...`);
                    await sleep(60000); // 1분 대기
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
            return JSON.parse(text);

        } catch (error) {
            console.error(`\n❌ Gemini API 파싱 에러:`, error.message);
            if (i === retries - 1) throw error;
            console.log(`-> 15초 후 재시도합니다... (${i + 1}/${retries})`);
            await sleep(15000);
        }
    }
}

async function main() {
    console.log("\n==================================================");
    console.log("🚀 백그라운드 AI 심층 분석기 (무한 동력 모드) 가동");
    console.log(`-> 장착된 API 키 개수: ${GEMINI_KEYS.length}개`);
    console.log("==================================================\n");

    try {
        console.log("1. Supabase 데이터베이스 접속 및 동기화 중...");

        // 2026학년도 학생만 가져옴
        const { data: students, error: err1 } = await supabase.from('students').select('*').eq('academic_year', '2026');
        const { data: surveys, error: err2 } = await supabase.from('surveys').select('student_pid, data');
        const { data: insights, error: err3 } = await supabase.from('student_insights').select('student_pid');
        const { data: allRecords, error: err4 } = await supabase.from('life_records').select('*');

        if (err1 || err2 || err3 || err4) throw new Error("DB 정보 조회 실패");

        const submissionSet = new Set(surveys.map(s => s.student_pid));
        const analyzedSet = new Set(insights.map(i => i.student_pid));

        // 제출은 했지만 분석(insights)이 없는 학생만 필터링
        const targetStudents = students.filter(s => submissionSet.has(s.pid) && !analyzedSet.has(s.pid));

        console.log(`\n📊 현재 기초조사 제출자: ${submissionSet.size}명`);
        console.log(`✅ 기존에 분석 완료된 인원: ${analyzedSet.size}명`);
        console.log(`🎯 이번에 뚫고 나갈 남은 대상자: ${targetStudents.length}명\n`);

        if (targetStudents.length === 0) {
            console.log("🎉 완벽합니다! 모든 학생의 분석이 이미 완료되었습니다.");
            return;
        }

        // 순차 분석 시작
        let currentIndex = 0;
        let successCount = 0;

        for (const student of targetStudents) {
            currentIndex++;
            console.log(`[${currentIndex}/${targetStudents.length}] 🧑‍🎓 ${student.student_id} ${student.name} 분석 중...`);

            const studentSurvey = surveys.find(s => s.student_pid === student.pid)?.data || {};
            // 생활기록 내용이 유의미한(5자 이상) 것만 뽑음
            const studentRecords = allRecords.filter(r => r.student_pid === student.pid && r.content && r.content.trim().length > 5).map(r => ({ category: r.category, content: r.content }));

            const promptText = `
다음 학생 데이터를 분석하여 JSON으로만 답변해줘.
이름: ${student.name}, 성별: ${student.gender}, 학급: ${student.class_info}
생활기록: ${JSON.stringify(studentRecords)}
기초조사: ${JSON.stringify(studentSurvey)}

형식:
{
  "summary": "3줄 요약",
  "student_type": "핵심 성향",
  "tags": ["키워드1", "키워드2", "키워드3"],
  "counseling_priority": {"level": "시급/주의/관심/안정 중 택1", "reason": "이유"},
  "holistic_analysis": {
    "career": "목표지향형/탐색형/방황형",
    "disposition": "내향 집중형/외향 활동형/균형형",
    "family": "보호 안정형/정서 의존형/책임 조기성숙형",
    "hobby_life": "경쟁 몰입형/창작 몰입형/소비형",
    "rhythm": "건강 안정형/수면 부족형",
    "emotion": "자기 인식형/고민 내재형/도움 요청형"
  },
  "group_role": "역할명",
  "stats": {"study": 0~100, "routine": 0~100, "emotion": 0~100, "social": 0~100, "self": 0~100, "resilience": 0~100},
  "detective": {"clues": ["단서1"], "deduction": "추론"},
  "action": "교사 조언"
}`;

            try {
                const aiResult = await callGemini(promptText);

                // 완성된 결과 DB 삽입
                const { error: insertErr } = await supabase.from('student_insights').insert([{
                    student_pid: student.pid,
                    insight_type: 'omni',
                    content: aiResult
                }]);

                if (insertErr) throw insertErr;

                console.log(`  ✔️ 분석 완료 및 DB 저장 성공!`);
                successCount++;

                // 다음 학생이 남아있다면 10초 대기 (한시간에 360명 속도, 넉넉함)
                if (currentIndex < targetStudents.length) {
                    console.log(`  ⏳ 다음 호출을 위해 10초 대기 중...`);
                    await sleep(10000);
                }

            } catch (err) {
                console.error(`  ❌ ${student.name} 분석 실패! 앗, 이 학생은 일시적으로 건너뜁니다.`, err.message);
                console.log(`  ⏳ 오류 발생으로 20초간 시스템 쿨다운...`);
                await sleep(20000);
            }
        }

        console.log(`\n==================================================`);
        console.log(`🎊 분석 작업이 모두 종료되었습니다.`);
        console.log(`-> 총 ${targetStudents.length}명 중 ${successCount}명 성공`);
        console.log(`==================================================\n`);

    } catch (error) {
        console.error("Critical Error:", error);
    }
}

// 스크립트 실행
main();
