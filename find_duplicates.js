import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findDuplicateNames() {
    console.log("🔍 1, 2, 3학년 전체 동명이인 조사를 시작합니다...");

    // 현재 학년도 데이터 전체 로드
    const { data: students, error } = await supabase
        .from('students')
        .select('name, student_id, class_info')
        .eq('academic_year', 2026); // 2026학년도로 가정 (필요시 수정)

    if (error) {
        console.error("데이터 로드 실패:", error);
        return;
    }

    // 이름별로 그룹화
    const nameGroups = {};
    students.forEach(s => {
        if (!nameGroups[s.name]) {
            nameGroups[s.name] = [];
        }
        nameGroups[s.name].push(s);
    });

    // 2명 이상인 이름 필터링
    const duplicates = Object.keys(nameGroups)
        .filter(name => nameGroups[name].length > 1)
        .map(name => ({
            name,
            count: nameGroups[name].length,
            students: nameGroups[name]
        }));

    if (duplicates.length === 0) {
        console.log("✅ 동명이인이 없습니다.");
    } else {
        console.log(`\n📊 총 ${duplicates.length}개의 동명이인 그룹을 발견했습니다:\n`);
        duplicates.forEach(group => {
            console.log(`[${group.name}] - ${group.count}명`);
            group.students.forEach(s => {
                console.log(`  - ${s.student_id} (${s.class_info})`);
            });
            console.log('-------------------');
        });
    }
}

findDuplicateNames();
