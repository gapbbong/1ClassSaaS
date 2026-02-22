-- 1. 전공/역할 정의 (Enums)
CREATE TYPE user_role AS ENUM ('admin', 'homeroom_teacher', 'nurse', 'counselor', 'subject_teacher', 'gatekeeper');

-- 2. 학생 마스터 테이블 (Student Master with Permanent ID)
CREATE TABLE public.students (
    pid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL, -- 학번 (연도별로 가변적)
    name TEXT NOT NULL,
    birth_date DATE,
    gender TEXT,
    contact TEXT,
    parent_contact TEXT,
    address TEXT,
    instagram_id TEXT,
    photo_url TEXT,
    academic_year INTEGER NOT NULL, -- 해당 학년도
    class_info TEXT NOT NULL, -- 학년/반 (예: 1-1)
    status TEXT DEFAULT 'active', -- 상태 (active, graduated, transferred)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 교사 테이블 (Teachers & Roles)
CREATE TABLE public.teachers (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role DEFAULT 'subject_teacher',
    assigned_class TEXT, -- 담당 학급 (예: 1-1)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 생활기록 테이블 (Life Records with Auto-logging)
CREATE TABLE public.life_records (
    id BIGSERIAL PRIMARY KEY,
    student_pid UUID REFERENCES public.students(pid) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id),
    teacher_email_prefix TEXT, -- 기록 교사 식별용 (email 앞부분)
    category TEXT NOT NULL, -- (예: 지도, 칭찬, 상담 등)
    content TEXT NOT NULL,
    is_positive BOOLEAN DEFAULT true, -- 긍정/부정 여부 (성장 그래프용)
    photos TEXT[], -- 첨부 사진 URL 배열 (반성문 등)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 기초조사 테이블 (Basic Survey Data)
CREATE TABLE public.surveys (
    id BIGSERIAL PRIMARY KEY,
    student_pid UUID REFERENCES public.students(pid) ON DELETE CASCADE,
    data JSONB NOT NULL, -- 전체 설문 응답 데이터
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 행적 로그 테이블 (Security Audit Logs)
CREATE TABLE public.access_logs (
    id BIGSERIAL PRIMARY KEY,
    teacher_id UUID REFERENCES public.teachers(id),
    student_pid UUID REFERENCES public.students(pid),
    action_type TEXT NOT NULL, -- (view, create, update, download)
    accessed_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Row Level Security (RLS) 설정
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- [정책 1] 담임 교사는 본인 학급 학생만 조회/기록 가능
CREATE POLICY "Homeroom access" ON public.students
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        class_info = (SELECT assigned_class FROM public.teachers WHERE id = auth.uid())
    );

-- [정책 2] 생활기록은 본인이 작성한 것이거나 관리 대상 학생 것만 조회 가능
CREATE POLICY "Record access" ON public.life_records
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        teacher_id = auth.uid() OR
        student_pid IN (SELECT pid FROM public.students WHERE class_info = (SELECT assigned_class FROM public.teachers WHERE id = auth.uid()))
    );

-- 8. Auth 가입 시 자동 Teacher 프로필 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.teachers (id, email, name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', '선생님'), 'subject_teacher');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Storage RLS 설정 및 정책
-- (Storage Bucket 'student-photos', 'evidence-photos' 가 생성되었음을 가정)
-- 모든 인증된 교사는 사진 조회 가능, 업로드는 본인 역할에 따라 제한
CREATE POLICY "Authenticated users can preview photos"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id IN ('student-photos', 'evidence-photos') );

CREATE POLICY "Teachers can upload student photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'student-photos' );
