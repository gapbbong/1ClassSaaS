import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createEvidenceBucket() {
    console.log("🚀 'evidence-photos' 버킷 생성 시작...");

    try {
        const { data, error } = await supabase.storage.createBucket('evidence-photos', {
            public: true, // 공개 접근 허용
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
            fileSizeLimit: 10485760 // 10MB
        });

        if (error) {
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                console.log("✅ 'evidence-photos' 버킷이 이미 존재합니다.");
            } else {
                throw error;
            }
        } else {
            console.log("✅ 'evidence-photos' 버킷을 성공적으로 생성했습니다!");
        }
    } catch (e) {
        console.error("❌ 버킷 생성 중 오류 발생:", e);
    }
}

createEvidenceBucket();
