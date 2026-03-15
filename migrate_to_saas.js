/**
 * [OneClass SaaS] 데이터 마이그레이션 스크립트 (기존 -> 신규)
 * 
 * 실행 방법: 
 * 1. npm install @supabase/supabase-js
 * 2. node migrate_to_saas.js
 */

import { createClient } from '@supabase/supabase-js';

// 1. 기존 프로젝트 정보 (Old)
const OLD_DB_URL = 'https://pwyflwjtafarkwbejoen.supabase.co';
const OLD_DB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3eWZsd2p0YWZhcmt3YmVqb2VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYzNTIzMSwiZXhwIjoyMDg3MjExMjMxfQ.DWtKZHpkM9D-mR26mG1ncrVHi2vxIre3l7-9bH4IVEE'; // Service Role 권한 권장

// 2. 신규 프로젝트 정보 (New)
const NEW_DB_URL = 'https://zkodhtlikylzwgkzjfpa.supabase.co';
const NEW_DB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2RodGxpa3lsendna3pqZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTYwMTcsImV4cCI6MjA4OTEzMjAxN30.biWmuaWzne0YBnkwyLr9kOM3EWMAnnLyUh69VlTqeJk';

const oldSupabase = createClient(OLD_DB_URL, OLD_DB_KEY);
const newSupabase = createClient(NEW_DB_URL, NEW_DB_KEY);

async function migrate() {
    console.log('🚀 마이그레이션 시작...');

    // A. 학교 정보 가져오기 또는 생성 (경성전자고)
    let { data: school, error: schoolErr } = await newSupabase
        .from('schools')
        .select('*')
        .eq('domain_prefix', 'ks')
        .single();

    if (schoolErr && schoolErr.code === 'PGRST116') { // 없으면 생성
        const { data: newSchool, error: createErr } = await newSupabase
            .from('schools')
            .upsert({ domain_prefix: 'ks', school_name: '경성전자고등학교' })
            .select()
            .single();
        
        if (createErr) {
            console.error('❌ 학교 정보 생성 실패:', createErr);
            return;
        }
        school = newSchool;
    } else if (schoolErr) {
        console.error('❌ 학교 정보 조회 실패:', schoolErr);
        return;
    }
    const schoolId = school.id;
    console.log(`✅ 학교(ks) 생성 완료 (ID: ${schoolId})`);

    // B. 데이터 이관 대상 테이블 목록
    const tables = ['students', 'teachers', 'life_records', 'surveys', 'access_logs', 'preset_categories', 'student_insights'];

    for (const table of tables) {
        console.log(`📦 [${table}] 이관 중...`);
        
        // 1. 기존 데이터 가져오기
        const { data: oldData, error: fetchErr } = await oldSupabase.from(table).select('*');
        if (fetchErr) {
            console.error(`❌ ${table} 조회 실패:`, fetchErr);
            continue;
        }

        if (!oldData || oldData.length === 0) {
            console.log(`ℹ️ ${table}에 데이터가 없습니다.`);
            continue;
        }

        // 2. school_id 추가하여 데이터 가공
        const newData = oldData.map(item => ({
            ...item,
            school_id: schoolId
        }));

        // 3. 신규 DB에 삽입 (동일 ID 존재 시 무시하도록 upsert)
        const { error: insertErr } = await newSupabase.from(table).upsert(newData);
        if (insertErr) {
            console.error(`❌ ${table} 삽입 실패:`, insertErr);
        } else {
            console.log(`✅ ${table} 이관 완료 (${newData.length}건)`);
        }
    }

    console.log('🎉 모든 데이터 마이그레이션이 완료되었습니다!');
}

migrate();
