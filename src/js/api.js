import { API_CONFIG } from './config.js';
import { supabase } from './supabase.js';

/**
 * 학생 기록을 조회합니다. (Supabase 버전)
 * @param {string} num - 학번
 * @returns {Promise<Array>} 기록 목록
 */
export async function fetchStudentRecords(num) {
    if (!num) return [];
    try {
        // 1. 학번으로 학생의 pid(UUID)를 먼저 찾습니다.
        const { data: student, error: sError } = await supabase
            .from('students')
            .select('pid')
            .eq('student_id', num)
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .single();

        if (sError || !student) throw new Error("학생을 찾을 수 없습니다.");

        // 2. 해당 pid를 가진 생활기록을 가져옵니다.
        const { data, error } = await supabase
            .from('life_records')
            .select('*, students!inner(name, photo_url)')
            .eq('student_pid', student.pid)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // UI 호환성을 위해 데이터 매핑
        return data.map(r => ({
            id: r.id,
            num: num,
            name: r.students.name,
            photo: r.students.photo_url,
            time: r.created_at,
            good: r.is_positive ? r.category : null,
            bad: !r.is_positive ? r.category : null,
            detail: r.content,
            teacher: r.teacher_email_prefix || "선생님"
        }));
    } catch (error) {
        console.error("Supabase Fetch Records Error:", error);
        throw new Error("기록을 불러오지 못했습니다.");
    }
}

/**
 * Supabase 데이터(영어 키)를 UI에서 기대하는 한글 키 형식으로 변환합니다.
 */
function mapStudentData(s) {
    if (!s) return null;
    return {
        ...s,
        "학년": s.academic_year || 1,
        "반": s.class_info ? parseInt(s.class_info.split('-')[1]) : 1,
        "성별": s.gender || "미지정",
        "이름": s.name || "이름없음",
        "학번": s.student_id,
        "번호": s.student_id ? parseInt(s.student_id.slice(-2)) : 0,
        "사진저장링크": s.photo_url,
        "연락처": s.contact || "",
        "인스타": s.instagram || s.insta || "",
        "이메일": s.email || "",
        "생년월일": s.birth_date || "",
        "주소": s.address || "",
        "보호자연락처": s.parent_contact || "",
        "보호자관계": s.parent_relation || "",
        "학적": s.status === 'active' ? '재학' : (s.status === 'transferred' ? '전출' : (s.status === 'withdrawn' ? '자퇴' : s.status)),
    };
}

/**
 * 학생 정보를 검색합니다. (Supabase 버전)
 * @returns {Promise<Array>} 학생 목록
 */
export async function fetchAllStudents() {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .neq('status', 'graduated')
            .order('student_id', { ascending: true });

        if (error) throw error;
        return data.map(mapStudentData);
    } catch (error) {
        console.error("Supabase Fetch Error:", error);
        throw new Error("학생 데이터를 불러오지 못했습니다.");
    }
}

/**
 * 새로운 기록을 저장합니다. (Supabase 버전)
 * @param {FormData} formData - 기록 데이터
 * @returns {Promise<Object>} 결과 객체
 */
export async function saveRecord(formData) {
    try {
        const num = formData.get("num");
        const good = formData.get("good");
        const bad = formData.get("bad");
        const detail = formData.get("detail");
        const teacher = formData.get("teacher");
        const time = formData.get("time");

        // 1. 학번으로 학생의 pid를 찾습니다.
        const { data: student, error: sError } = await supabase
            .from('students')
            .select('pid')
            .eq('student_id', num)
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .single();

        if (sError || !student) throw new Error("학생을 찾을 수 없습니다.");

        const photos = formData.get("photos"); // JSON string of array

        // 2. life_records에 삽입합니다.
        const { error } = await supabase
            .from('life_records')
            .insert({
                student_pid: student.pid,
                category: good || bad || "일반",
                content: detail || "",
                is_positive: !!good,
                teacher_email_prefix: teacher,
                photos: photos ? JSON.parse(photos) : null,
                created_at: time ? new Date(time).toISOString() : new Date().toISOString()
            });

        if (error) throw error;

        return { result: "success" };
    } catch (error) {
        console.error("Supabase Save Error:", error);
        throw new Error("저장에 실패했습니다.");
    }
}

/**
 * 기록을 삭제합니다. (Supabase 버전)
 * @param {string} num - 학번
 * @param {string} time - 기록 시간 (ISO string)
 * @returns {Promise<Object>} 결과 객체
 */
export async function deleteRecord(num, time) {
    try {
        // 1. 학번으로 학생의 pid를 찾습니다.
        const { data: student, error: sError } = await supabase
            .from('students')
            .select('pid')
            .eq('student_id', num)
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .single();

        if (sError || !student) throw new Error("학생을 찾을 수 없습니다.");

        // 2. pid와 시간을 조건으로 삭제합니다.
        const { error } = await supabase
            .from('life_records')
            .delete()
            .eq('student_pid', student.pid)
            .eq('created_at', time);

        if (error) throw error;

        return { result: "success" };
    } catch (error) {
        console.error("Supabase Delete Error:", error);
        throw new Error("삭제에 실패했습니다.");
    }
}

/**
 * 학급별 또는 전체 기록을 조회합니다. (Supabase 버전)
 * @param {string|number} grade - 학년 (선택)
 * @param {string|number} classNum - 반 (선택)
 * @returns {Promise<Array>} 기록 목록
 */
export async function fetchGroupRecords(grade, classNum) {
    try {
        let query = supabase
            .from('life_records')
            .select('*, students!inner(student_id, name, photo_url, class_info, academic_year)')
            .eq('students.academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .neq('category', '상담');

        if (grade && classNum) {
            query = query.eq('students.class_info', `${grade}-${classNum}`);
        } else if (grade) {
            query = query.like('students.class_info', `${grade}-%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // UI 호환성을 위해 데이터 매핑
        return data.map(r => ({
            id: r.id,
            num: r.students.student_id,
            name: r.students.name,
            time: r.created_at,
            good: r.is_positive ? r.category : null,
            bad: !r.is_positive ? r.category : null,
            detail: r.content,
            photo: r.students.photo_url,
            teacher: r.teacher_email_prefix || "선생님"
        }));
    } catch (error) {
        console.error("Supabase Fetch Group Records Error:", error);
        throw new Error("그룹 기록을 불러오지 못했습니다.");
    }
}

/**
 * 대시보드용 통계 데이터를 가져옵니다. (Supabase 버전 - 생활기록 건수 집계)
 */
export async function fetchClassStats() {
    try {
        // 1. 전체 생활기록 건수 조회
        const { count: grandTotal, error: gError } = await supabase
            .from('life_records')
            .select('*', { count: 'exact', head: true })
            .neq('category', '상담');

        if (gError) throw gError;

        // 2. 반별 생활기록 건수 집계
        const { data, error } = await supabase
            .from('life_records')
            .select('students!inner(class_info, academic_year)')
            .eq('students.academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .neq('category', '상담');

        if (error) throw error;

        const classStats = {};
        data.forEach(item => {
            if (item && item.students && item.students.class_info) {
                const key = item.students.class_info;
                classStats[key] = (classStats[key] || 0) + 1;
            }
        });

        return { grandTotal: grandTotal || 0, classStats };
    } catch (error) {
        console.error("Supabase Stats Error:", error);
        return { grandTotal: 0, classStats: {} };
    }
}

/**
 * 선생님 연락처 정보를 가져옵니다. (Supabase 버전)
 */
export async function fetchClassInfo() {
    try {
        const { data, error } = await supabase
            .from('teachers')
            .select('*');

        if (error) throw error;

        // 0. 기본 1-1 ~ 3-6 구조 생성 (데이터가 없어도 박스는 나오도록)
        const infoMap = {};
        for (let g = 1; g <= 3; g++) {
            for (let c = 1; c <= 6; c++) {
                const key = `${g}-${c}`;
                infoMap[key] = {
                    grade: g,
                    class: c,
                    homeroom: '미정',
                    homeroomPhone: '',
                    homeroomEmail: '',
                    sub: '미정',
                    subPhone: '',
                    subEmail: ''
                };
            }
        }

        // 1. 담임 선생님 정보 매핑 (assigned_class 필드에 값이 있는 모든 교사를 담임으로 간주)
        data.forEach(t => {
            if (t.assigned_class) {
                if (infoMap[t.assigned_class]) {
                    infoMap[t.assigned_class].homeroom = t.name;
                    infoMap[t.assigned_class].homeroomPhone = t.phone || '';
                    infoMap[t.assigned_class].homeroomEmail = t.email || '';
                }
            }
        });

        // 2. 부담임 선생님 정보 매핑 (sub_grade와 sub_class가 있는 경우)
        data.forEach(t => {
            if (t.sub_grade && t.sub_class) {
                const key = `${t.sub_grade}-${t.sub_class}`;
                if (infoMap[key]) {
                    infoMap[key].sub = t.name;
                    infoMap[key].subPhone = t.phone || '';
                    infoMap[key].subEmail = t.email || '';
                }
            }
        });

        return Object.values(infoMap);
    } catch (error) {
        console.error("Supabase Fetch Class Info Error:", error);
        // 에러 시에도 기본 구조는 반환하여 화면 안 깨지게 함
        const fallback = [];
        for (let g = 1; g <= 3; g++) {
            for (let c = 1; c <= 6; c++) {
                fallback.push({ grade: g, class: c, homeroom: '미정', homeroomPhone: '', sub: '미정', subPhone: '' });
            }
        }
        return fallback;
    }
}

/**
 * 특정 반의 학생 목록만 가져옵니다. (Supabase 버전)
 */
export async function fetchStudentsByClass(grade, classNum) {
    try {
        const classTarget = `${grade}-${classNum}`;
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('class_info', classTarget)
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .neq('status', 'graduated')
            .order('student_id', { ascending: true });

        if (error) throw error;
        return data.map(mapStudentData);
    } catch (error) {
        console.error("Supabase Class Students Error:", error);
        throw new Error("학급 학생 데이터를 불러오지 못했습니다.");
    }
}

/**
 * 여러 학생에게 동일한 기록을 일괄 저장합니다. (Supabase 버전)
 * @param {Array} targets - {num, name} 객체 배열
 * @param {Object} recordData - {good, bad, detail, teacher}
 * @returns {Promise<Object>} 결과 객체
 */
export async function bulkSaveRecords(targets, recordData) {
    try {
        const nums = targets.map(t => t.num);

        // 1. 모든 학생의 pid를 한꺼번에 찾습니다.
        const { data: students, error: sError } = await supabase
            .from('students')
            .select('pid, student_id')
            .in('student_id', nums)
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR);

        if (sError) throw sError;

        // 2. 삽입할 데이터 배열 생성
        const insertData = students.map(s => ({
            student_pid: s.pid,
            category: recordData.good || recordData.bad || "일반",
            content: recordData.detail || "",
            is_positive: !!recordData.good,
            teacher_email_prefix: recordData.teacher,
            created_at: new Date().toISOString()
        }));

        // 3. 일괄 삽입
        const { error } = await supabase
            .from('life_records')
            .insert(insertData);

        if (error) throw error;

        return { result: "success", count: insertData.length };
    } catch (error) {
        console.error("Supabase Bulk Save Error:", error);
        throw new Error("일괄 저장에 실패했습니다.");
    }
}

/**
 * 증빙 사진(반성문 등)을 업로드합니다.
 * @param {File} file - 업로드할 파일 객체
 * @param {string} studentId - 학번 (파일명 구성용)
 * @returns {Promise<string>} 업로드된 파일의 Public URL
 */
export async function uploadEvidencePhoto(file, studentId) {
    try {
        const timestamp = new Date().getTime();
        const extension = file.name.split('.').pop();
        const fileName = `${studentId}_${timestamp}.${extension}`;
        const filePath = `${API_CONFIG.CURRENT_ACADEMIC_YEAR}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('evidence-photos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('evidence-photos')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error("Upload Error:", error);
        throw new Error("사진 업로드에 실패했습니다.");
    }
}

/**
 * 특정 학생의 기초조사 데이터를 가져옵니다.
 * @param {string} num - 학번
 */
export async function fetchSurveyData(num) {
    if (!num) return null;
    try {
        // 1. 학번으로 학생 정보를 먼저 가져옵니다 (pid가 필요)
        const { data: student, error: sError } = await supabase
            .from('students')
            .select('*')
            .eq('student_id', num)
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .single();

        if (sError || !student) return null;

        // 2. 해당 pid를 가진 기초조사 데이터를 가져옵니다.
        const { data, error } = await supabase
            .from('surveys')
            .select('*')
            .eq('student_pid', student.pid)
            .maybeSingle();

        if (error) throw error;

        return {
            student: mapStudentData(student),
            survey: data ? { ...data, ...(data.data || {}) } : null
        };
    } catch (error) {
        console.error("Fetch Survey Error:", error);
        return null;
    }
}
