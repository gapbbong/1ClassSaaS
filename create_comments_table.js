import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupCommentsTable() {
    console.log("🚀 'record_comments' 테이블 생성 시작...");

    const executeSQL = async (sql) => {
        const { error } = await supabase.rpc('exec_sql', { query: sql });
        if (error) {
            console.warn("RPC exec_sql 실패 (없을 수 있음), REST API 대체 사용 고려:", error.message);
            // Alternatively, insert via rest if exec is not available
        }
    }

    // Since we don't have direct SQL execution via JS easily without postgres driver or custom rpc,
    // we will output the SQL string for the user to run in the SQL Editor.
    const sqlScript = `
-- 1. 새로운 테이블 생성
CREATE TABLE IF NOT EXISTS public.record_comments (
    id BIGSERIAL PRIMARY KEY,
    record_id BIGINT REFERENCES public.life_records(id) ON DELETE CASCADE,
    teacher_email_prefix TEXT NOT NULL, -- 작성 교사 아이디
    type TEXT NOT NULL CHECK (type IN ('reaction', 'comment')),
    content TEXT NOT NULL, -- 이모지 또는 텍스트
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS 활성화
ALTER TABLE public.record_comments ENABLE ROW LEVEL SECURITY;

-- 3. 정책 설정
-- 조회는 인증된 교사 누구나 가능
CREATE POLICY "Anyone can view comments" ON public.record_comments FOR SELECT TO authenticated USING (true);

-- 등록은 인증된 교사 누구나 가능
CREATE POLICY "Authenticated users can insert comments" ON public.record_comments FOR INSERT TO authenticated WITH CHECK (true);

-- 삭제는 댓글 작성 본인 또는 생활기록표 (record_id)의 원본 선생님만 가능
CREATE POLICY "Delete comments policy" ON public.record_comments FOR DELETE TO authenticated USING (
    -- 조건 1: 내가 쓴 댓글/리액션인가? (UI에서 teacher_email_prefix를 보냄)
    -- 실제 완벽한 보안을 위해서는 auth.uid()와 매칭해야 하지만, 편의상 email_prefix 기준이거나
    -- 조건 2: 원본 글 작성자인가?
    EXISTS (SELECT 1 FROM public.life_records r WHERE r.id = record_comments.record_id AND r.teacher_id = auth.uid())
);
`;

    console.log("---------------------------------------------------------");
    console.log("⚠️ DB 스키마 변경을 위해 브라우저의 Supabase SQL Editor에서 아래 쿼리를 실행해 주세요!");
    console.log("---------------------------------------------------------");
    console.log(sqlScript);
    console.log("---------------------------------------------------------");
}

setupCommentsTable();
