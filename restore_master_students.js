import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreMasterStudents() {
    try {
        console.log("🚀 pool_2025_g2.json에서 누락된 학생 정보를 복원합니다...");

        const poolDataPath = path.resolve('pool_2025_g2.json');
        const pool2025G2Raw = fs.readFileSync(poolDataPath, 'utf8');
        const pool2025G2 = JSON.parse(pool2025G2Raw);

        // 현재 students 검색
        const { data: existingStudents, error } = await supabase.from('students').select('pid');
        const existingPids = new Set(existingStudents.map(s => s.pid));

        // DB에 없는 json 데이터 찾기
        const missing = pool2025G2.filter(r => !existingPids.has(r.student_pid));
        console.log(`🔍 총 ${missing.length}명의 학생이 students 테이블에 누락되어 복원을 시도합니다.`);

        if (missing.length === 0) {
            console.log("✅ 모든 학생이 이미 students 테이블에 존재합니다. 바로 3학년 복원 스크립트를 실행해도 됩니다.");
            return;
        }

        // 이름 정보를 다른 파일이나 백업에서 찾기 위해 project_handbook_2025 등 참고가 필요하나
        // 현재 JSON에는 'name'이 없음. 이름이 필수(not null)라면 임시이름 할당.
        // 기존에 백업된 파일이 있다면 그곳에서 매핑.
        // 일단은 real_students_data_sample.json 이나 이전 마이그레이션 백업 파일을 찾아 이름 매핑을 시도.

        const samplePath = path.resolve('real_students_data_sample.json');
        let nameMap = new Map();
        if (fs.existsSync(samplePath)) {
            const sampleRaw = fs.readFileSync(samplePath, 'utf8');
            const sampleData = JSON.parse(sampleRaw);
            sampleData.forEach(s => {
                nameMap.set(s.pid, s.name);
            });
        }

        const newStudents = missing.map((record, index) => {
            // 2025년 기준 임시 학번 부여 - 반 정보와 인덱스를 활용 (예: 25(학년) + 1(반) + 01(번호) 등)
            // 정확한 학번이 원본 JSON에 없으므로 기존 클래스 "2-1"의 뒷자리로 임의의 학번 생성
            const classNum = record.class_info.split('-')[1] || '0';
            const tempId = `252${classNum}${String(index + 1).padStart(2, '0')}`;

            // 이름이 없으면 '복원학생_01' 등으로 임시 할당
            const studentName = nameMap.get(record.student_pid) || `복원학생_${String(index + 1).padStart(2, '0')}`;
            return {
                pid: record.student_pid,
                student_id: tempId,
                name: studentName,
                academic_year: 2026, // 현재 2026학년도 기준으로 복원
                class_info: record.class_info.replace('2-', '3-'), // 3학년으로 일단 등록 (나중에 수정 가능)
                status: 'active'
            };
        });

        // DB에 insert
        const { data: inserted, error: insertError } = await supabase
            .from('students')
            .insert(newStudents)
            .select();

        if (insertError) {
            throw new Error(`마스터 데이터 삽입 에러: ${insertError.message}`);
        }

        console.log(`🎉 성공적으로 ${inserted.length}명의 기본 학생 정보를 복원했습니다!`);

    } catch (err) {
        console.error(`💥 에러 발생: ${err.message}`);
    }
}

restoreMasterStudents();
