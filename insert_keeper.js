import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function insertKeeper() {
    console.log("Adding Keeper to Supabase Auth and teachers table...");
    const email = 'keeper@kse.hs.kr';

    // 1. 이미 존재하는 Auth 사용자 검색
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error("Auth 사용자 목록 조회 오류:", usersError);
        return;
    }

    const existingUser = usersData.users.find(u => u.email === email);
    if (!existingUser) {
        console.error("keeper@kse.hs.kr 사용자가 Auth에 존재하지 않습니다.");
        return;
    }

    const userId = existingUser.id;
    console.log(`기존 Auth 사용자 찾음 (ID: ${userId}). teachers 테이블 등록 시작...`);

    // 2. teachers 테이블에 데이터 삽입 (upsert)
    const { data, error } = await supabase
        .from('teachers')
        .upsert([
            {
                id: userId,
                name: '지킴이',
                email: email,
                role: 'admin' // 일단 관리자 또는 조회가능한 롤로 임시 배정
            }
        ]);

    if (error) {
        console.error("teachers 삽입(upsert) 오류:", error);
    } else {
        console.log("Successfully upserted keeper into teachers table:", data);
    }
}

insertKeeper();
