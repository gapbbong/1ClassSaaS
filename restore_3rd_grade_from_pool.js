import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase 환경 변수가 설정되지 않았습니다.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restore3rdGradeData() {
    try {
        console.log("🚀 2025학년도 2학년 데이터를 바탕으로 2026학년도 3학년 복원을 시작합니다...");

        // 1. pool_2025_g2.json 읽기
        const poolDataPath = path.resolve('pool_2025_g2.json');
        if (!fs.existsSync(poolDataPath)) {
            throw new Error(`파일을 찾을 수 없습니다: ${poolDataPath}`);
        }
        const pool2025G2Raw = fs.readFileSync(poolDataPath, 'utf8');
        const pool2025G2 = JSON.parse(pool2025G2Raw);

        console.log(`✅ pool_2025_g2.json 로드 완료: 총 ${pool2025G2.length}명`);

        // 2. 현재 DB의 3학년 데이터 (2026년도) 삭제
        console.log("🧹 기존 2026학년도 3학년 데이터를 초기화합니다...");
        const { error: deleteError } = await supabase
            .from('student_history')
            .delete()
            .eq('academic_year', 2026)
            .like('class_info', '3-%');

        if (deleteError) {
            throw new Error(`기존 데이터 삭제 실패: ${deleteError.message}`);
        }
        console.log("✅ 기존 2026학년도 3학년 데이터 삭제 완료.");

        // 3. 학생 정보 가져와서 매핑
        console.log("🔍 학생 마스터 정보(students 테이블)를 조회합니다...");
        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('pid, name');

        if (studentsError) {
            throw new Error(`학생 정보 조회 실패: ${studentsError.message}`);
        }

        // UUID를 키로, 학생 이름을 값으로 매핑 확인을 위해 필요하다면 사용할 맵 
        const studentMap = new Map();
        students.forEach(s => studentMap.set(s.pid, s.name));

        // 4. 새 3학년 데이터 생성 - 2025년 반 기준으로 임시 배정 혹은 학번 정보 재가공 필요
        // 일단 2학년 반, 번호를 그대로 3학년으로 올릴 지 확인이 필요하나, 데이터 보존 및 시스템 등록상 임의 배정 없이 올리는 로직
        // 보통 반은 유지되지 않지만, 현재 복원 스펙상 기존에 잘못 삭제된 학생들의 DB를 다시 만들어두는게 주 목적이므로
        // 학급 정보('class_info')를 '3-?' 또는 기존 2학년 반번호 기반 배정 로직 사용

        console.log("⏳ 2026학년도 3학년 삽입용 데이터를 준비합니다...");

        const insertData = pool2025G2.map(record => {
            // 기존 "2-x" 를 "3-x"로 변경
            const newClassInfo = record.class_info.replace('2-', '3-');

            return {
                student_pid: record.student_pid,
                academic_year: 2026,
                class_info: newClassInfo
            };
        });

        console.log(`📦 삽입 대기 데이터: 총 ${insertData.length}건`);

        // 5. DB에 Insert
        const { data: insertedData, error: insertError } = await supabase
            .from('student_history')
            .insert(insertData)
            .select();

        if (insertError) {
            throw new Error(`데이터 삽입 실패: ${insertError.message}`);
        }

        console.log(`✅ 2026학년도 3학년 복원 성공! (총 ${insertedData.length}명 추가됨)`);

    } catch (err) {
        console.error(`💥 에러 발생: ${err.message}`);
    }
}

restore3rdGradeData();
