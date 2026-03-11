import { API_CONFIG } from './config.js';
import { supabase } from './supabase.js';
import CryptoJS from 'crypto-js';

/**
 * 로컬 스토리지의 토큰을 복호화하여 현재 교사 이메일을 반환합니다.
 */
export function getCurrentTeacherEmail() {
    const encrypted = localStorage.getItem('teacher_auth_token');
    if (!encrypted) return "";
    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, API_CONFIG.SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        return "";
    }
}

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
        return data.map(r => {
            let teacher = r.teacher_email_prefix || "선생님";
            if (teacher === "최지은") teacher = "assari"; // 특정 교사 성함 매핑

            return {
                id: r.id,
                num: num,
                name: r.students.name,
                photo: r.students.photo_url,
                photos: r.photos,
                time: r.created_at,
                good: r.is_positive ? r.category : null,
                bad: !r.is_positive ? r.category : null,
                detail: r.content,
                teacher: teacher
            };
        });
    } catch (error) {
        console.error("Supabase Fetch Records Error:", error);
        throw new Error("기록을 불러오지 못했습니다.");
    }
}

/**
 * 생활기록 선택 항목(Presets)을 가져옵니다.
 * Supabase 우선, 실패 시 fallback 데이터 반환.
 */
export async function fetchPresets() {
    const fallbackGood = ["1. 기본생활 우수", "2. 자기주도학습", "3. 예의바름", "4. 수업태도 좋음", "5. 솔선수범", "6. 교우관계 원만"];
    const fallbackBad = [
        "1. 지각", "2. 복장불량", "3. 화장", "4. 악세사리 착용", "5. 신발불량", "6. 가방없음", "7. 두발불량", "8. 수업태도 불량", "9. 휴대폰 무단사용", "10. 무단외출", "11. 교복미착용",
        "12. 부적절한 언어(비속어,욕설) 사용", "13. 교사 모독/지시 불이행", "14. 친구와 신체적/언어적 마찰", "15. 수업분위기 저해/타인 학습권 침해", "16. 성 관련 부적절한 언행"
    ];

    try {
        const { data, error } = await supabase
            .from('preset_categories')
            .select('type, item_name')
            .order('display_order', { ascending: true });

        if (error || !data || data.length === 0) throw new Error("Supabase presets not found");

        return {
            good: data.filter(i => i.type === 'good').map(i => i.item_name),
            bad: data.filter(i => i.type === 'bad').map(i => i.item_name)
        };
    } catch (err) {
        console.warn("Using fallback presets:", err.message);
        return { good: fallbackGood, bad: fallbackBad };
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
        "학생폰": s.contact || "", // 검색 페이지 연동용
        "인스타": s.instagram || s.insta || "",
        "생년월일": s.birth_date || "",
        "주소": s.address || "",
        "집주소": s.address || "", // 검색 페이지 연동용
        "출신중": s.middle_school || s["출신중"] || "", // 검색 페이지 연동용
        "보호자연락처": s.parent_contact || "",
        "보호자관계": s.parent_relation || "",
        "학적": (() => {
            const st = String(s.status || "").toLowerCase().trim();
            if (st === 'active' || st.includes('재학')) return '재학';
            if (st === 'transferred' || st.includes('전출')) return '전출';
            if (st === 'withdrawn' || st === 'dropout' || st.includes('자퇴')) return '자퇴';
            if (st === 'graduated' || st.includes('졸업')) return '졸업';
            return s.status || '재학';
        })(),
    };
}

/**
 * 학생 정보를 검색합니다. (Supabase 버전 + 설문 데이터 통합)
 * @returns {Promise<Array>} 학생 목록
 */
export async function fetchAllStudents() {
    try {
        // students와 surveys를 left join하여 한꺼번에 가져옵니다.
        const { data, error } = await supabase
            .from('students')
            .select('*, surveys(data)')
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .neq('status', 'graduated')
            .order('student_id', { ascending: true });

        if (error) throw error;

        return data.map(s => {
            const surveyData = s.surveys && s.surveys.length > 0 ? s.surveys[0].data : {};
            const mapped = mapStudentData(s);

            // 설문 데이터 통합 (기존 학생 마스터 정보가 없으면 설문에서 채움)
            return {
                ...mapped,
                "출신중": mapped["출신중"] || surveyData["출신중"] || surveyData["출신 중학교"] || surveyData["중학교"] || "",
                "집주소": mapped["집주소"] || surveyData["집주소"] || surveyData["주소"] || "",
                "학생폰": mapped["학생폰"] || surveyData["학생폰"] || surveyData["연락처"] || surveyData["학생 연락처"] || "",
            };
        });
    } catch (error) {
        console.error("Supabase Fetch All Students Error:", error);
        throw new Error("학생 데이터를 불러오지 못했습니다.");
    }
}

/**
 * 동일한 기록이 이미 존재하는지 확인합니다. (같은 날짜, 학생, 카테고리, 내용)
 */
export async function checkDuplicateRecord(studentId, category, content, dateStr) {
    try {
        // 1. 학생 pid 조회
        const { data: student } = await supabase
            .from('students')
            .select('pid')
            .eq('student_id', studentId)
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .single();

        if (!student) return false;

        // 2. 해당 날짜의 시작과 끝 계산 (KST 기준)
        const date = new Date(dateStr);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString();

        // 3. 중복 조회
        const { data, error } = await supabase
            .from('life_records')
            .select('id')
            .eq('student_pid', student.pid)
            .eq('category', category)
            .eq('content', content || '')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .limit(1);

        if (error) return false;
        return data && data.length > 0;
    } catch (err) {
        console.error("Duplicate Check Error:", err);
        return false;
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

        // [추가] 기록 교사 매핑 (2026-02-28)
        let teacherValue = teacher;
        if (teacherValue === "최지은") teacherValue = "assari";

        // 2. life_records에 삽입합니다.
        const { error } = await supabase
            .from('life_records')
            .insert({
                student_pid: student.pid,
                category: good || bad || "일반",
                content: detail || "",
                is_positive: !!good,
                teacher_email_prefix: teacherValue,
                photos: photos ? JSON.parse(photos) : null,
                created_at: time ? new Date(time).toISOString() : new Date().toISOString()
            });

        if (error) throw error;
        
        // 활동 로그 기록 (추가)
        const currentEmail = getCurrentTeacherEmail();
        if (currentEmail) {
            logPageView(currentEmail, window.location.pathname, "record_save");
        }

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
        return data.map(r => {
            let teacher = r.teacher_email_prefix || "선생님";
            if (teacher === "최지은") teacher = "assari"; // 특정 교사 성함 매핑

            return {
                id: r.id,
                num: r.students.student_id,
                name: r.students.name,
                time: r.created_at,
                good: r.is_positive ? r.category : null,
                bad: !r.is_positive ? r.category : null,
                detail: r.content,
                photo: r.students.photo_url,
                photos: r.photos,
                teacher: teacher
            };
        });
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
            .select('students!inner(academic_year)', { count: 'exact', head: true })
            .eq('students.academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
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
 * 현재 로그인한 교사의 프로필 정보를 가져옵니다.
 * @param {string} email - 교사 이메일
 */
export async function getTeacherProfile(email) {
    if (!email) return null;
    try {
        const { data, error } = await supabase
            .from('teachers')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Get Teacher Profile Error:", error);
        return null;
    }
}

/**
 * 특정 학급의 모든 설문 데이터를 가져옵니다.
 * @param {string} classInfo - '1-1' 형식
 */
export async function fetchClassSurveys(classInfo) {
    try {
        const { data: students, error: sError } = await supabase
            .from('students')
            .select('pid, student_id, name')
            .eq('class_info', classInfo)
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .neq('status', 'graduated');

        if (sError) throw sError;
        if (!students || students.length === 0) return [];

        const studentPids = students.map(s => s.pid);

        const { data: surveys, error: surveyError } = await supabase
            .from('surveys')
            .select('*')
            .in('student_pid', studentPids)
            .order('submitted_at', { ascending: false });

        if (surveyError) throw surveyError;

        // 학생별로 가장 최근 설문 하나만 추출
        const latestSurveysMap = new Map();
        surveys.forEach(s => {
            if (!latestSurveysMap.has(s.student_pid)) {
                latestSurveysMap.set(s.student_pid, s);
            }
        });

        // 학생 정보와 설문 데이터 결합
        return students.map(s => ({
            ...s,
            survey: latestSurveysMap.get(s.pid) || null
        }));

    } catch (error) {
        console.error("Fetch Class Surveys Error:", error);
        return [];
    }
}

/**
 * 특정 학급 학생들의 상세 기록 건수(잘한일, 일반, 지도)를 가져옵니다.
 * @param {string} classInfo - '1-1' 형식
 */
export async function fetchDetailedRecordCounts(classInfo) {
    try {
        const { data: students, error: sError } = await supabase
            .from('students')
            .select('pid')
            .eq('class_info', classInfo)
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .neq('status', 'graduated');

        if (sError || !students) throw sError;
        const studentPids = students.map(s => s.pid);

        const { data, error } = await supabase
            .from('life_records')
            .select('student_pid, is_positive, category, content, created_at')
            .in('student_pid', studentPids)
            .neq('category', '상담');

        if (error) throw error;

        // studentPids를 키로 하는 초기 맵 생성
        const countMap = {};
        studentPids.forEach(pid => {
            countMap[pid] = { good: 0, normal: 0, bad: 0, early: 0, out: 0 };
        });

        const neutralCategories = ['기록', '생활기록', '일반'];

        // 오늘 날짜 기준 (KST)
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

        data.forEach(r => {
            if (countMap[r.student_pid]) {
                // 1. 일반 생활기록 집계 (누적)
                if (neutralCategories.includes(r.category)) {
                    countMap[r.student_pid].normal++;
                } else if (r.is_positive) {
                    countMap[r.student_pid].good++;
                } else {
                    countMap[r.student_pid].bad++;
                }

                // 2. [수정] 근태 뱃지 (당일 기록 + '근태' 카테고리 + 내용 기반)
                if (r.category === '근태') {
                    const recordTime = new Date(r.created_at).getTime();
                    if (recordTime >= startOfToday && recordTime <= endOfToday) {
                        const content = r.content || "";
                        if (content.includes("조퇴")) {
                            countMap[r.student_pid].early++;
                        }
                        if (content.includes("외출")) {
                            // [추가] 외출 시간에만 표시 (시작 ~ 종료 사이)
                            const timeMatch = content.match(/(오전|오후)\s*외출\((\d{2}:\d{2})\s*~\s*(\d{2}:\d{2})\)/);
                            if (timeMatch) {
                                const [_, ampm, startStr, endStr] = timeMatch;
                                const isPm = ampm === '오후';

                                const convertTo24h = (rawTime, isPmFlag) => {
                                    let [h, m] = rawTime.split(':').map(Number);
                                    if (isPmFlag && h < 12) h += 12;
                                    if (!isPmFlag && h === 12) h = 0;
                                    return h * 100 + m;
                                };

                                let start24 = convertTo24h(startStr, isPm);
                                let end24 = convertTo24h(endStr, isPm);

                                // 12시간제를 넘어가면서 종료 시간이 시작 시간보다 작아진 경우 보정 (예: 11:30 ~ 01:30)
                                if (end24 < start24) {
                                    end24 += 1200;
                                }

                                const nowObj = new Date();
                                const nowTime = nowObj.getHours() * 100 + nowObj.getMinutes();

                                if (nowTime >= start24 && nowTime <= end24) {
                                    countMap[r.student_pid].out++;
                                }
                            } else {
                                // 파싱 실패 시 기본적으로 표시 (예외 케이스)
                                countMap[r.student_pid].out++;
                            }
                        }
                    }
                }
            }
        });




        return countMap;
    } catch (error) {
        console.error("Fetch Detailed Record Counts Error:", error);
        return {};
    }
}


/**
 * 특정 학급 전체의 기초조사 데이터를 가져옵니다.
 */
export async function fetchClassSurveysForContacts(grade, classNum) {
    try {
        const { data: students, error: sError } = await supabase
            .from('students')
            .select('pid')
            .eq('class_info', `${grade}-${classNum}`)
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR);

        if (sError || !students) return [];
        const pids = students.map(s => s.pid);

        const { data, error } = await supabase
            .from('surveys')
            .select('*')
            .in('student_pid', pids)
            .order('submitted_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Fetch Class Surveys Error:", error);
        return [];
    }
}


/**
 * 특정 학급의 모든 생활기록을 가져옵니다.
 * @param {string} classInfo - '1-1' 형식
 */
export async function fetchClassRecords(classInfo) {
    try {
        const { data: students, error: sError } = await supabase
            .from('students')
            .select('pid')
            .eq('class_info', classInfo)
            .eq('academic_year', API_CONFIG.CURRENT_ACADEMIC_YEAR)
            .neq('status', 'graduated');

        if (sError) throw sError;
        if (!students || students.length === 0) return [];

        const studentPids = students.map(s => s.pid);

        const { data, error } = await supabase
            .from('life_records')
            .select('*, students!inner(name, student_id, photo_url)')
            .in('student_pid', studentPids)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(r => ({
            id: r.id,
            num: r.students.student_id,
            name: r.students.name,
            photo: r.students.photo_url,
            time: r.created_at,
            good: r.is_positive ? r.category : null,
            bad: !r.is_positive ? r.category : null,
            detail: r.content,
            teacher: r.teacher_email_prefix
        }));
    } catch (error) {
        console.error("Fetch Class Records Error:", error);
        return [];
    }
}

/**
 * 특정 반의 학생 목록만 가져옵니다. (Supabase 버전)
 */
export async function fetchStudentsByClass(grade, classNum, year = null) {
    try {
        const targetYear = year || API_CONFIG.CURRENT_ACADEMIC_YEAR;
        const classTarget = `${grade}-${classNum}`;
        let query = supabase
            .from('students')
            .select('*')
            .eq('class_info', classTarget)
            .eq('academic_year', targetYear)
            .order('student_id', { ascending: true });

        // 현재 학년도가 아닐 경우(아카이브) 졸업생 여부와 관계없이 모두 가져옵니다.
        if (targetYear === API_CONFIG.CURRENT_ACADEMIC_YEAR) {
            query = query.neq('status', 'graduated');
        }

        const { data, error } = await query;

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
        const insertData = students.map(s => {
            let teacherValue = recordData.teacher;
            if (teacherValue === "최지은") teacherValue = "assari";

            return {
                student_pid: s.pid,
                category: recordData.category || recordData.good || recordData.bad || "일반",
                content: recordData.detail || "",
                is_positive: recordData.hasOwnProperty('is_positive') ? recordData.is_positive : !!recordData.good,
                teacher_email_prefix: teacherValue,
                created_at: recordData.time ? new Date(recordData.time).toISOString() : new Date().toISOString()
            };
        });

        // 3. 일괄 삽입
        const { error } = await supabase
            .from('life_records')
            .insert(insertData);

        if (error) throw error;

        // 활동 로그 기록 (추가)
        const currentEmail = getCurrentTeacherEmail();
        if (currentEmail) {
            logPageView(currentEmail, window.location.pathname, "bulk_record_save");
        }

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
        throw new Error(`사진 업로드에 실패했습니다. (${error.message || '오류 상세 정보 없음'})`);
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

        // 2. 해당 pid를 가진 기초조사 데이터를 최신순으로 가져옵니다.
        const { data, error } = await supabase
            .from('surveys')
            .select('*')
            .eq('student_pid', student.pid)
            .order('submitted_at', { ascending: false })
            .limit(1)
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

/**
 * 특정 기록에 달린 코멘트(리액션/댓글)를 가져옵니다.
 * @param {number} recordId - 생활기록 ID
 */
export async function fetchRecordComments(recordId) {
    try {
        const { data, error } = await supabase
            .from('record_comments')
            .select('*')
            .eq('record_id', recordId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Fetch Comments Error:", error);
        return [];
    }
}

/**
 * 기록에 리액션이나 댓글을 추가합니다.
 * @param {Object} payload { record_id, teacher_email_prefix, type('reaction'|'comment'), content } 
 */
export async function addRecordComment(payload) {
    try {
        const { data, error } = await supabase
            .from('record_comments')
            .insert(payload)
            .select('*');

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error("Add Comment Error:", error);
        throw new Error("코멘트 등록 실패");
    }
}

/**
 * 기록 코멘트를 삭제합니다. 
 * @param {number} commentId 
 */
export async function deleteRecordComment(commentId) {
    try {
        const { error } = await supabase
            .from('record_comments')
            .delete()
            .eq('id', commentId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Delete Comment Error:", error);
        throw new Error("삭제 권한이 없거나 실패했습니다.");
    }
}

/**
 * 모든 교사 정보를 가져옵니다.
 */
export async function fetchAllTeachers() {
    try {
        const { data, error } = await supabase
            .from('teachers')
            .select('*');

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Fetch All Teachers Error:", error);
        return [];
    }
}

/**
 * 사용자 활동 로그를 기록합니다. (분석용)
 * @param {string} email - 교사 이메일
 * @param {string} pageName - 페이지명
 * @param {string} action - 작업 종류 (기본 page_view)
 */
export async function logPageView(email, pageName, action = 'page_view') {
    if (!email) return;
    try {
        await supabase.from('user_logs').insert({
            teacher_email: email,
            page_path: pageName || window.location.pathname,
            action: action
        });
    } catch (error) {
        // 통계 로그 실패가 메인 기능에 영향을 주지 않도록 로깅만 합니다.
        console.warn("Analytics log failed:", error);
    }
}
