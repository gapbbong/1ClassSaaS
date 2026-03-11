import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const goodDeeds = [
    "1. 기본생활 우수",
    "2. 자기주도학습",
    "3. 예의바름",
    "4. 수업태도 좋음",
    "5. 솔선수범",
    "6. 교우관계 원만",
    "상담"
];

const badDeeds = [
    "1. 지각",
    "2. 복장불량",
    "3. 화장",
    "4. 악세사리 착용",
    "5. 신발불량",
    "6. 가방없음",
    "7. 두발불량",
    "8. 수업태도 불량",
    "9. 휴대폰 무단사용",
    "10. 무단외출",
    "11. 교복미착용",
    "12. 부적절한 언어(비속어,욕설) 사용",
    "13. 교사 모독/지시 불이행",
    "14. 친구와 신체적/언어적 마찰",
    "15. 수업분위기 저해/타인 학습권 침해",
    "16. 성 관련 부적절한 언행"
];

async function migratePresets() {
    console.log("🚀 Starting presets migration to 'preset_categories'...");

    try {
        const tableName = 'preset_categories';
        
        console.log("Inserting data...");
        
        const insertData = [];
        goodDeeds.forEach((item_name, index) => {
            insertData.push({ type: 'good', item_name, display_order: index + 1 });
        });
        badDeeds.forEach((item_name, index) => {
            insertData.push({ type: 'bad', item_name, display_order: index + 1 });
        });

        const { data, error } = await supabase.from(tableName).upsert(insertData, { onConflict: 'type,item_name' });
        
        if (error) {
            console.error("❌ Error inserting data:", error.message);
        } else {
            console.log("✅ Successfully inserted/updated presets in 'preset_categories'!");
        }

    } catch (err) {
        console.error("💥 Critical error:", err.message);
    }
}

migratePresets();
