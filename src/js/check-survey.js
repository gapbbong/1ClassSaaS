import { fetchStudentsByClass } from './api.js';
import { supabase } from './supabase.js';
import CryptoJS from 'crypto-js';
import { API_CONFIG } from './config.js';

let currentClassData = []; // { student: {...}, survey: {...} | null }
let currentFilter = 'all'; // 'all', 'submitted', 'pending'

document.addEventListener('DOMContentLoaded', async () => {
    initClassDropdown();
    setupEventListeners();
});

// 학급 드롭다운 초기화
async function initClassDropdown() {
    const dropdown = document.getElementById('class-dropdown');
    dropdown.innerHTML = '<option value="">학급을 선택하세요</option>';

    for (let g = 1; g <= 3; g++) {
        for (let c = 1; c <= 6; c++) {
            const classStr = `${g}-${c}`;
            const option = document.createElement('option');
            option.value = classStr;
            option.textContent = `${g}학년 ${c}반`;
            dropdown.appendChild(option);
        }
    }

    // 선생님 정보 확인 및 본인 반 자동 선택
    try {
        const encryptedToken = localStorage.getItem('teacher_auth_token');
        if (encryptedToken) {
            const bytes = CryptoJS.AES.decrypt(encryptedToken, API_CONFIG.SECRET_KEY);
            const teacherEmail = bytes.toString(CryptoJS.enc.Utf8);

            if (teacherEmail) {
                const { data: teacherData, error } = await supabase
                    .from('teachers')
                    .select('assigned_class, role')
                    .eq('email', teacherEmail)
                    .single();

                if (!error && teacherData && teacherData.assigned_class) {
                    dropdown.value = teacherData.assigned_class;
                    document.getElementById('search-btn').disabled = false;

                    // 관리자가 아닌 일반 교사는 다른 반을 조회할 수 없도록 드롭다운 비활성화
                    if (teacherData.role !== 'admin') {
                        dropdown.disabled = true;
                    }

                    // 바로 조회 실행
                    setTimeout(() => {
                        loadClassSurveyStatus();
                    }, 100);
                } else {
                    console.log("선생님 배정 학급 정보 없음 또는 조회 실패:", error);
                }
            }
        }
    } catch (err) {
        console.error("선생님 정보 호출 실패:", err);
    }

    // 선택 감지
    dropdown.addEventListener('change', () => {
        const analyzeBtn = document.getElementById('search-btn');
        analyzeBtn.disabled = !dropdown.value;
    });
}

function setupEventListeners() {
    document.getElementById('search-btn').addEventListener('click', loadClassSurveyStatus);

    // 필터 탭 이벤트
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderStudentList();
        });
    });
}

// 1. 학급 명단과 제출 데이터 로드 및 병합
async function loadClassSurveyStatus() {
    const classInfo = document.getElementById('class-dropdown').value;
    if (!classInfo) return;

    // UI 상태 변경
    document.getElementById('welcome-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'none';
    document.getElementById('summary-dashboard').style.display = 'none';
    document.getElementById('loading-view').style.display = 'block';

    const [grade, classNum] = classInfo.split('-');

    try {
        // 1. 학생 명단 로드 (api.js 활용)
        const students = await fetchStudentsByClass(grade, classNum);

        // 2. 해당 학급 학생들의 PID 추출
        const pids = students.map(s => s.pid);

        // 3. surveys 테이블에서 해당 PID들의 제출 내역 로드
        let surveyMap = {};
        if (pids.length > 0) {
            const { data: surveys, error } = await supabase
                .from('surveys')
                .select('student_pid, submitted_at')
                .in('student_pid', pids);

            if (error) throw error;

            surveys.forEach(survey => {
                surveyMap[survey.student_pid] = survey;
            });
        }

        // 4. 데이터 병합
        currentClassData = students.map(student => {
            return {
                student: student,
                survey: surveyMap[student.pid] || null
            };
        });

        // 5. 완료 후 렌더링
        document.getElementById('loading-view').style.display = 'none';
        document.getElementById('summary-dashboard').style.display = 'grid';
        document.getElementById('result-view').style.display = 'block';

        renderSummary();
        renderStudentList();

        // 6. 실시간 업데이트 구독 설정 (기존 구독 해제 후 새로 설정)
        setupRealtimeSubscription(classInfo, pids);

    } catch (error) {
        console.error("데이터 로드 오류:", error);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
        document.getElementById('loading-view').style.display = 'none';
        document.getElementById('welcome-view').style.display = 'block';
    }
}

let surveySubscription = null;

// 실시간 구독 설정 함수
function setupRealtimeSubscription(classInfo, pids) {
    if (surveySubscription) {
        supabase.removeChannel(surveySubscription);
    }

    if (pids.length === 0) return;

    surveySubscription = supabase.channel(`public:surveys:${classInfo}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'surveys' },
            (payload) => {
                const newSurvey = payload.new;
                // 현재 로드된 학생의 데이터인지 확인
                if (pids.includes(newSurvey.student_pid)) {
                    console.log('실시간 새 설문 제출 감지!', newSurvey);

                    // currentClassData 업데이트
                    const targetIndex = currentClassData.findIndex(d => d.student.pid === newSurvey.student_pid);
                    if (targetIndex !== -1 && currentClassData[targetIndex].survey === null) {
                        currentClassData[targetIndex].survey = newSurvey;

                        // 화면 리렌더링
                        renderSummary();
                        renderStudentList();
                    }
                }
            }
        )
        .subscribe();
}

// 2. 대시보드 요약 렌더링
function renderSummary() {
    const total = currentClassData.length;
    const submitted = currentClassData.filter(d => d.survey !== null).length;
    const pending = total - submitted;

    document.getElementById('summary-total').textContent = `${total}명`;
    document.getElementById('summary-submitted').textContent = `${submitted}명`;
    document.getElementById('summary-pending').textContent = `${pending}명`;
}

// 3. 학생 리스트 렌더링
function renderStudentList() {
    const tbody = document.getElementById('student-tbody');
    tbody.innerHTML = '';

    // 필터링 적용
    const filteredData = currentClassData.filter(d => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'submitted') return d.survey !== null;
        if (currentFilter === 'pending') return d.survey === null;
        return true;
    });

    if (filteredData.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" style="text-align:center; padding: 40px; color:#94a3b8;">해당하는 학생이 없습니다.</td>`;
        tbody.appendChild(tr);
        return;
    }

    filteredData.forEach(item => {
        const student = item.student;
        const isSubmitted = item.survey !== null;

        const tr = document.createElement('tr');
        if (!isSubmitted) {
            tr.classList.add('miss'); // 배경색 연한 빨강 처리용 클래스
        }

        // 제출 시간 포맷팅
        let timeStr = '-';
        if (isSubmitted && item.survey.submitted_at) {
            const date = new Date(item.survey.submitted_at);
            timeStr = `${date.getMonth() + 1}월 ${date.getDate()}일 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }

        // 상태 뱃지
        const statusBadge = isSubmitted
            ? `<span class="badge submitted">제출 완료</span>`
            : `<span class="badge pending">미제출</span>`;

        // 이름 렌더링 (전화번호 툴팁 추가 등 가능)
        const nameHtml = `<div style="font-weight:bold;">${student['이름']}</div>
                          <div style="font-size:0.8rem; color:#64748b;">${student['연락처'] || ''}</div>`;

        tr.innerHTML = `
            <td><strong>${student['학번'] || ''}</strong></td>
            <td>${nameHtml}</td>
            <td>${statusBadge}</td>
            <td class="submit-time">${timeStr}</td>
        `;

        tbody.appendChild(tr);
    });
}
