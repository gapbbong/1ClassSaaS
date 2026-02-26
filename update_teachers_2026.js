import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTeachers2026() {
    console.log("🚀 2026학년도 교사 배정 정보 업데이트 시작...");

    const csvData = fs.readFileSync('Teachers.csv', 'utf8');
    const lines = csvData.split('\n');
    const teachers = [];

    // CSV 파싱 (아이디,이름,담임학년,담임반,담임전화번호,부담임학년,부담임반,부담임전화번호)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [email, name, grade, classNum] = line.split(',');

        if (email && (grade || classNum)) {
            teachers.push({
                email,
                name,
                assigned_class: grade && classNum ? `${grade}-${classNum}` : null
            });
        }
    }

    console.log(`📊 처리할 교사 수: ${teachers.length}명`);

    for (const t of teachers) {
        try {
            // 이메일 기준으로 업데이트 (이메일이 없는 경우 이름으로 찾기 등은 위험하므로 생략)
            if (t.email === '0') {
                // 이름으로 찾기 (장효윤 선생님 등 이메일이 '0'으로 되어 있는 경우 대비)
                const { error } = await supabase
                    .from('teachers')
                    .update({ assigned_class: t.assigned_class })
                    .eq('name', t.name);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('teachers')
                    .update({ assigned_class: t.assigned_class })
                    .eq('email', t.email);
                if (error) throw error;
            }
            console.log(`✅ 배정 완료: ${t.name} (${t.assigned_class || '없음'})`);
        } catch (e) {
            console.error(`❌ 에러 (${t.name}):`, e.message);
        }
    }

    console.log("\n✨ 2026학년도 교사 배정이 완료되었습니다.");
}

updateTeachers2026();
