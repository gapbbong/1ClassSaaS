import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectGraduated() {
    const classes = ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6'];

    console.log("🎓 [검증] 격리된(졸업 처리된) 3학년 명단 확인...\n");

    for (const cls of classes) {
        const { data, error } = await supabase
            .from('students')
            .select('student_id, name, status, academic_year')
            .eq('academic_year', 2025)
            .eq('status', 'graduated')
            .eq('class_info', cls)
            .order('student_id');

        if (error) {
            console.error(`❌ ${cls} 조회 실패:`, error.message);
            continue;
        }

        console.log(`\n📦 [${cls}] 반 - 총 ${data?.length || 0}명`);
        if (data && data.length > 0) {
            const list = data.map(s => `${s.student_id} ${s.name} (${s.status})`).join(', ');
            console.log(list);
        } else {
            console.log("(명단 없음)");
        }
    }
}

inspectGraduated();
