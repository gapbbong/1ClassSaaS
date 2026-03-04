import dotenv from 'dotenv';
dotenv.config();

const GEMINI_KEYS = (process.env.VITE_GEMINI_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);

async function checkModels() {
    console.log(`\n🔍 [모델 가용성 상세 점검]`);

    // 테스트해볼 모델 목록
    const models = [
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite-preview-02-05',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro'
    ];

    for (const key of GEMINI_KEYS) {
        const masked = `[${key.slice(-4)}]`;
        console.log(`\n--- Key: ${masked} ---`);

        for (const model of models) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
                });

                if (res.ok) {
                    console.log(`✅ ${model}: 사용 가능`);
                } else {
                    const data = await res.json().catch(() => ({}));
                    console.log(`❌ ${model}: ${res.status} - ${data.error?.message || 'Unknown'}`);
                }
            } catch (e) {
                console.log(`💥 ${model}: 연결 실패 - ${e.message}`);
            }
        }
    }
}

checkModels();
