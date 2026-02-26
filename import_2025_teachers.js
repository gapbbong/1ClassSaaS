const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const list2025 = [
    { class: '1-1', homeroom: '최희락', sub: '김태경' },
    { class: '1-2', homeroom: '최현정', sub: '김동길' },
    { class: '1-3', homeroom: '전지훈', sub: '구동후' },
    { class: '1-4', homeroom: '이혜영', sub: '신승현' },
    { class: '1-5', homeroom: '정혜인', sub: '김웅환' },
    { class: '1-6', homeroom: '정유리', sub: '이상수' },
    { class: '2-1', homeroom: '황태겸', sub: '김선옥' },
    { class: '2-2', homeroom: '정민주', sub: '김덕원' },
    { class: '2-3', homeroom: '이민희', sub: '하미경' },
    { class: '2-4', homeroom: '백승민', sub: '이갑종' },
    { class: '2-5', homeroom: '양지원', sub: '정필구' },
    { class: '2-6', homeroom: '권대호', sub: '황철현' },
    { class: '3-1', homeroom: '이관태', sub: '박성환' },
    { class: '3-2', homeroom: '손주희', sub: '박창우' },
    { class: '3-3', homeroom: '손수곤', sub: '한현숙' },
    { class: '3-4', homeroom: '이효상', sub: '김현희' },
    { class: '3-5', homeroom: '김민경', sub: '이경미' },
    { class: '3-6', homeroom: '홍지아', sub: '최지은' }
];

async function run() {
    // 1. 기존 배정 완전 초기화 (모두과목교사 처리)
    await supabase.from('teachers').update({
        assigned_class: null,
        sub_grade: null,
        sub_class: null,
        role: 'subject_teacher'
    }).neq('id', '00000000-0000-0000-0000-000000000000'); // dummy condition to update all

    console.log("기존 배정 정보 초기화 완료");

    // 2. 2025 명단에 맞춰 담임/부담임 업데이트
    for (const item of list2025) {
        const [grade, cls] = item.class.split('-');

        // 담임 배정
        const { data: hrData } = await supabase.from('teachers').select('*').eq('name', item.homeroom).limit(1);
        if (hrData && hrData.length > 0) {
            await supabase.from('teachers').update({
                assigned_class: item.class,
                role: 'homeroom_teacher'
            }).eq('id', hrData[0].id);
        } else {
            console.log(`[담임 추가] ${item.homeroom} 선생님이 DB에 없어 새로 추가합니다.`);
            await supabase.from('teachers').insert({
                name: item.homeroom,
                assigned_class: item.class,
                role: 'homeroom_teacher'
            });
        }

        // 부담임 배정
        const { data: subData } = await supabase.from('teachers').select('*').eq('name', item.sub).limit(1);
        if (subData && subData.length > 0) {
            await supabase.from('teachers').update({
                sub_grade: grade,
                sub_class: cls
            }).eq('id', subData[0].id);
        } else {
            console.log(`[부담임 추가] ${item.sub} 선생님이 DB에 없어 새로 추가합니다.`);
            await supabase.from('teachers').insert({
                name: item.sub,
                sub_grade: grade,
                sub_class: cls,
                role: 'subject_teacher' // 부담임은 일단 역할 자체보단 sub 필드가 중요
            });
        }
    }

    console.log("2025학년도 명단 적용 완료!");
}

run();
