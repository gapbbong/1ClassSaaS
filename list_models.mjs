import dotenv from 'dotenv';
dotenv.config();

const GEMINI_KEYS = (process.env.VITE_GEMINI_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);

async function listAllModels() {
    for (const key of GEMINI_KEYS) {
        const masked = `[${key.slice(-4)}]`;
        console.log(`\n--- Listing Models for Key: ${masked} ---`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.models) {
                data.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
            } else {
                console.log("No models found or error:", JSON.stringify(data));
            }
        } catch (e) {
            console.log("Fetch failed:", e.message);
        }
        break; // 일단 첫 번째 키만 확인
    }
}

listAllModels();
