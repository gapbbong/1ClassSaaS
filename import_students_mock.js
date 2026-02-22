import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PHOTO_DIR = path.resolve(__dirname, process.env.PHOTO_DIR || './25 학생 사진/25 학생');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function importMockStudents() {
    console.log('🚀 임시 학생 데이터 생성 및 삽입 시작...');

    if (!fs.existsSync(PHOTO_DIR)) {
        console.error('❌ 사진 폴더를 찾을 수 없습니다.');
        return;
    }

    const files = fs.readdirSync(PHOTO_DIR).filter(file =>
        ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase())
    );

    const students = files.map(file => {
        const studentId = path.parse(file).name;
        const grade = studentId.charAt(0);
        const classNum = studentId.charAt(1);

        return {
            student_id: studentId,
            name: `학생_${studentId}`,
            academic_year: 2025,
            class_info: `${grade}-${classNum}`,
            status: 'active'
        };
    });

    console.log(`📝 총 ${students.length}명의 학생 데이터를 준비했습니다.`);

    // 100개씩 끊어서 삽입
    const chunkSize = 100;
    for (let i = 0; i < students.length; i += chunkSize) {
        const chunk = students.slice(i, i + chunkSize);
        console.log(`⌛ [${i + 1} ~ ${Math.min(i + chunkSize, students.length)}] 삽입 중...`);

        const { error } = await supabase
            .from('students')
            .insert(chunk);

        if (error) {
            console.error('❌ 삽입 실패:', error.message);
        }
    }

    console.log('✅ 학생 데이터 삽입 완료!');
}

importMockStudents();
