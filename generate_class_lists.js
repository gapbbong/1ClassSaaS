import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Using the one from .env

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE URL or KEY missing in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateClassLists() {
    console.log("🔍 [분석] 2026학년도 학생 데이터 가져오는 중...");

    const { data: students, error } = await supabase
        .from('students')
        .select('student_id, name, class_info')
        .eq('academic_year', 2026)
        .order('student_id');

    if (error) {
        console.error("❌ 데이터 가져오기 실패:", error.message);
        return;
    }

    if (!students || students.length === 0) {
        console.warn("⚠️ 2026학년도 학생 데이터가 없습니다.");
        return;
    }

    console.log(`✅ 총 ${students.length}명의 데이터 로드 완료.`);

    // Grouping by class (학년-반 or just class_info)
    const classes = {};
    students.forEach(s => {
        const cls = s.class_info || "미지정";
        if (!classes[cls]) classes[cls] = [];
        classes[cls].push({
            "학번": s.student_id,
            "이름": s.name,
            "빈칸": ""
        });
    });

    // Create output directory if needed
    const outputDir = './class_lists';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    for (const [cls, list] of Object.entries(classes)) {
        const sanitizedCls = cls.replace(/[^a-zA-Z0-9가-힣-]/g, '_');
        const filename = `${outputDir}/2026학년도_${sanitizedCls}_명렬.xlsx`;

        // Create data with headers
        const data = list.map(s => [s["학번"], s["이름"], ""]);
        const worksheet = XLSX.utils.aoa_to_sheet([["학번", "이름", " "], ...data]);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 10 }, // 학번
            { wch: 15 }, // 이름
            { wch: 20 }  // 비고 (빈칸)
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, cls);
        XLSX.writeFile(workbook, filename);
        console.log(`💾 저장 완료: ${filename}`);
    }

    console.log("\n🚀 모든 학급의 명렬표 생성이 완료되었습니다!");
}

generateClassLists();
