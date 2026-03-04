import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_KEYS = (process.env.VITE_GEMINI_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testPrompt() {
    const key = GEMINI_KEYS[0];
    const model = 'gemini-2.0-flash';
    const ctx = [{ pid: "test-pid-123", name: "홍길동", survey: { "성격": "활발함" } }];
    const prompt = `Student Analysis JSON Array (summary, student_type, tags, counseling_priority, holistic_analysis, group_role, stats, detective, action). Return ONLY JSON. Data: ${JSON.stringify(ctx)}`;

    console.log("Testing Gemini with prompt...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        console.log("Response Status:", res.status);
        if (data.candidates && data.candidates[0]) {
            console.log("Response Content sample:", data.candidates[0].content.parts[0].text.substring(0, 200));
        } else {
            console.log("Full Response:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testPrompt();
