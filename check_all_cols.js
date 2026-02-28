import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
    console.log("🔍 students 테이블의 실제 컬럼 목록 조회 (RPC/SQL)...");

    const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'students' }); // 만약 RPC가 없다면 아래 query 사용

    if (error) {
        // Fallback: query information_schema
        const { data: cols, error: e2 } = await supabase
            .from('pg_attribute')
            .select('attname')
            .eq('attrelid', 'public.students':: regclass)
            .eq('attisdropped', false)
            .gt('attnum', 0);

        // 주의: 위 쿼리는 Supabase에서 직접 실행하기 어려울 수 있으므로
        // 그냥 데이터를 아주 많이 뽑아서 키들을 합쳐보겠습니다.
        console.log("⚠️ RPC 실패, 여러 행의 키 집합 확인 중...");
        const { data: samples } = await supabase.from('students').select('*').limit(50);
        const allKeys = new Set();
        samples.forEach(s => Object.keys(s).forEach(k => allKeys.add(k)));
        console.log("📄 모든 발견된 컬럼:", Array.from(allKeys));
    } else {
        console.log("📄 컬럼 목록:", data);
    }
}

checkColumns();
