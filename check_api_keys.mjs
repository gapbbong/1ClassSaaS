import dotenv from 'dotenv';
dotenv.config();

const GEMINI_KEYS = (process.env.VITE_GEMINI_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);

async function checkAllKeys() {
    console.log(`\n🔑 [API 키 상태 점검] 총 ${GEMINI_KEYS.length}개 탐색`);

    for (let i = 0; i < GEMINI_KEYS.length; i++) {
        const key = GEMINI_KEYS[i];
        const masked = `${key.slice(0, 8)}...${key.slice(-4)}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
            });

            if (res.ok) {
                console.log(`[${i + 1}] ${masked}: ✅ 정상 (200 OK)`);
            } else if (res.status === 429) {
                console.log(`[${i + 1}] ${masked}: ❌ 한도 초과 (429)`);
            } else {
                const data = await res.json();
                console.log(`[${i + 1}] ${masked}: ⚠️ 오류 (${res.status}) - ${data.error?.message || '알 수 없는 에러'}`);
            }
        } catch (e) {
            console.log(`[${i + 1}] ${masked}: 💥 연결 실패 - ${e.message}`);
        }
    }
}

checkAllKeys();
