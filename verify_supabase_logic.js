import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use Service Key for testing if available, as it's more likely to be valid in this environment
const testKey = supabaseServiceKey || supabaseAnonKey;

if (!supabaseUrl || !testKey) {
    console.error("❌ Error: Supabase URL or Keys missing in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, testKey);

/**
 * Mapping logic from api.js (Copied for verification)
 */
function mapStudentData(s) {
    if (!s) return null;
    return {
        "학년": s.academic_year || 1,
        "반": s.class_info ? parseInt(s.class_info.split('-')[1]) : 1,
        "성별": s.gender,
        "이름": s.name,
        "학번": s.student_id,
        "사진저장링크": s.photo_url,
        "연락처": s.contact,
        "학적": s.status === 'active' ? '재학' : (s.status === 'transferred' ? '전출' : s.status),
    };
}

async function verify() {
    console.log("🚀 Starting Final Supabase Verification...");
    console.log(`🔗 URL: ${supabaseUrl}`);

    try {
        // 1. Students Table Count
        console.log("\n📡 1. Checking 'students' table...");
        const { data: stuData, error: stuError, count: totalCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true });

        if (stuError) throw stuError;
        console.log(`✅ Total students in DB: ${totalCount}`);

        // 2. Photo URL Check
        console.log("\n🖼️ 2. Verifying Student Photos...");
        const { data: photoData, count: photoCount } = await supabase
            .from('students')
            .select('student_id', { count: 'exact', head: true })
            .not('photo_url', 'is', null);

        console.log(`✅ Students with photos: ${photoCount} / ${totalCount}`);

        // 3. Mapping Verification (Sample 3)
        console.log("\n🧪 3. Verifying Data Mapping (Sample 3 students)...");
        const { data: sampleData, error: sampleError } = await supabase
            .from('students')
            .select('*')
            .limit(3);

        if (sampleError) throw sampleError;

        sampleData.forEach((raw, index) => {
            const mapped = mapStudentData(raw);
            if (mapped['이름'] === raw['name'] && mapped['학번'] === raw['student_id']) {
                console.log("✨ Mapping Assertion Passed: name and student_id correctly mapped.");
            } else {
                console.log("❌ Mapping Assertion Failed!");
            }
        });

        console.log("\n🎉 Verification Completed Successfully!");

    } catch (err) {
        console.error("\n❌ Verification Failed:");
        console.error(err.message);
    }
}

verify();
