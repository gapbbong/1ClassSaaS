import { supabase, getTeacherProfile, getCurrentTeacherEmail, fetchPresets } from './api.js';
import * as XLSX from 'xlsx';

let currentTeacher = null;
let allStudents = [];
let allRecords = [];
let badBehaviorPresets = [];
let currentSortMode = 'id'; // 'id' or 'latest'

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 교사 인증 확인 (기존 index.html 방식과 통일)
    const email = getCurrentTeacherEmail();
    console.log("Current Teacher Email from Token:", email);
    if (!email) {
        alert('로그인이 필요합니다.');
        location.href = 'index.html';
        return;
    }

    try {
        const teacher = await getTeacherProfile(email);
        console.log("Teacher Profile Result:", teacher);
        if (!teacher) {
            alert(`교사 정보를 찾을 수 없습니다. (${email})`);
            location.href = 'index.html';
            return;
        }
        currentTeacher = teacher;
    } catch (e) {
        console.error("Auth check failed", e);
        alert('인증 확인 중 오류가 발생했습니다: ' + e.message);
        location.href = 'index.html';
        return;
    }

    initUI();
    setupEventListeners();
});

function initUI() {
    const scopeSelect = document.getElementById('scope-select');
    const classSelect = document.getElementById('class-select');
    const isAdmin = currentTeacher.role === 'admin' || currentTeacher.role === 'counselor' || currentTeacher.email === 'gapbbong@naver.com';

    // 권한에 따른 범위 제한
    if (!isAdmin) {
        // 담임이면 자기 반만 기본, 그 외엔 제한적
        if (currentTeacher.role === 'homeroom_teacher' && currentTeacher.assigned_class) {
            // 담임은 자기 반만 보게 하거나 학년까지 허용할지는 정책에 따라.. 
            // 일단 '반별'로 강제하고 반 선택 고정
            scopeSelect.value = 'class';
            // 다른 옵션 제거/비활성화
            Array.from(scopeSelect.options).forEach(opt => {
                if (opt.value !== 'class') opt.disabled = true;
            });
        } else {
            // 일반 교사는? 일단 제한
            scopeSelect.value = 'class';
            Array.from(scopeSelect.options).forEach(opt => {
                if (opt.value !== 'class') opt.disabled = true;
            });
        }
    }

    // 반 선택 옵션 생성 (1-1 ~ 3-6)
    for (let g = 1; g <= 3; g++) {
        for (let c = 1; c <= 6; c++) {
            const opt = document.createElement('option');
            opt.value = `${g}-${c}`;
            opt.textContent = `${g}학년 ${c}반`;
            classSelect.appendChild(opt);
        }
    }

    // 담임이면 자기 반 기본 선택
    if (currentTeacher.assigned_class) {
        classSelect.value = currentTeacher.assigned_class;
    }

    updateScopeSelectors();
    initBadSubItems();
}

async function initBadSubItems() {
    try {
        const presets = await fetchPresets();
        badBehaviorPresets = presets.bad || [];
        
        const container = document.getElementById('bad-sub-items');
        container.innerHTML = '';
        
        badBehaviorPresets.forEach(item => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" class="bad-sub-check" value="${item}"> ${item}`;
            container.appendChild(label);
        });

        // "못한 일" 메인 체크박스 상태에 따라 초기 표시 여부 결정
        const badMain = document.getElementById('bad-main-check');
        const badAll = document.getElementById('bad-all-check');
        
        badAll.checked = false; // 기본 해제
        document.getElementById('bad-sub-container').style.display = badMain.checked ? 'block' : 'none';

    } catch (e) {
        console.error("Failed to load presets", e);
    }
}

function updateScopeSelectors() {
    const val = document.getElementById('scope-select').value;
    document.getElementById('grade-select').style.display = (val === 'grade' || val === 'grade_dept') ? 'inline-block' : 'none';
    document.getElementById('dept-select').style.display = (val === 'dept' || val === 'grade_dept') ? 'inline-block' : 'none';
    document.getElementById('class-select').style.display = (val === 'class') ? 'inline-block' : 'none';
}

function setupEventListeners() {
    document.getElementById('scope-select').addEventListener('change', updateScopeSelectors);
    document.getElementById('query-btn').addEventListener('click', handleQuery);
    document.getElementById('print-btn').addEventListener('click', () => window.print());
    document.getElementById('download-btn').addEventListener('click', downloadExcel);

    // 못한 일 처리
    const badMain = document.getElementById('bad-main-check');
    badMain.addEventListener('change', () => {
        document.getElementById('bad-sub-container').style.display = badMain.checked ? 'block' : 'none';
    });

    const badAll = document.getElementById('bad-all-check');
    badAll.addEventListener('change', () => {
        const subs = document.querySelectorAll('.bad-sub-check');
        subs.forEach(s => s.checked = badAll.checked);
    });

    const modal = document.getElementById('photo-modal');
    document.getElementById('close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // 정렬 버튼 처리
    const sortIdBtn = document.getElementById('sort-id-btn');
    const sortLatestBtn = document.getElementById('sort-latest-btn');

    sortIdBtn.addEventListener('click', () => {
        currentSortMode = 'id';
        sortIdBtn.classList.add('active');
        sortLatestBtn.classList.remove('active');
        if (allStudents.length > 0) handleQuery(); // 다시 렌더링을 위해 쿼리 재실행 (또는 캐시된 데이터 활용 가능하나 안전하게 재실행)
    });

    sortLatestBtn.addEventListener('click', () => {
        currentSortMode = 'latest';
        sortLatestBtn.classList.add('active');
        sortIdBtn.classList.remove('active');
        if (allStudents.length > 0) handleQuery();
    });
}

function downloadExcel() {
    const table = document.getElementById('report-table');
    const wb = XLSX.utils.table_to_book(table, { sheet: "학생기록현황" });
    const now = new Date();
    const dateStr = `${now.getFullYear()}${now.getMonth()+1}${now.getDate()}`;
    XLSX.writeFile(wb, `학생기록현황_${dateStr}.xlsx`);
}

async function handleQuery() {
    const loading = document.getElementById('loading-msg');
    const resultSec = document.getElementById('print-result');
    const errorMsg = document.getElementById('error-msg');
    
    loading.style.display = 'block';
    resultSec.style.display = 'none';
    errorMsg.style.display = 'none';

    try {
        const scope = document.getElementById('scope-select').value;
        const grade = document.getElementById('grade-select').value;
        const dept = document.getElementById('dept-select').value;
        const targetClass = document.getElementById('class-select').value;
        
        const categories = Array.from(document.querySelectorAll('#category-checks input:checked')).map(cb => cb.value);
        const selectedBadSubs = Array.from(document.querySelectorAll('.bad-sub-check:checked')).map(cb => cb.value);
        
        if (categories.length === 0) {
            throw new Error('포함할 항목을 최소 하나 선택해주세요.');
        }

        // 1. 학생 데이터 가져오기 (학번순)
        let studentQuery = supabase.from('students').select('pid, name, student_id, class_info').eq('status', 'active');
        
        if (scope === 'grade') {
            studentQuery = studentQuery.like('class_info', `${grade}-%`);
        } else if (scope === 'class') {
            studentQuery = studentQuery.eq('class_info', targetClass);
        }
        
        const { data: students, error: sErr } = await studentQuery.order('student_id');
        if (sErr) throw sErr;

        // 학과 필터링 (학과 정보가 DB에 따로 없으므로 로직으로 필터링)
        let filteredStudents = students;
        if (scope === 'dept' || scope === 'grade_dept') {
            filteredStudents = students.filter(s => {
                const match = s.class_info.match(/(\d)-(\d)/);
                if (!match) return false;
                const g = parseInt(match[1]);
                const c = parseInt(match[2]);
                
                let major = "미지정";
                if ([1, 2, 3].includes(c)) major = "IoT전기과";
                else if (g === 1 && [4, 5, 6].includes(c)) major = "게임콘텐츠과";
                else if (g >= 2 && [4, 5, 6].includes(c)) major = "전자제어과";
                
                if (scope === 'grade_dept') return g === parseInt(grade) && major === dept;
                return major === dept;
            });
        }

        if (filteredStudents.length === 0) {
            throw new Error('해당 조건의 학생이 없습니다.');
        }

        // 2. 기록 가져오기
        const pids = filteredStudents.map(s => s.pid);
        // Supabase .in 은 최대 1000개 정도가 한계이나 학교 규모에선 무난
        const { data: records, error: rErr } = await supabase
            .from('life_records')
            .select('student_pid, category, content, is_positive')
            .in('student_pid', pids);
        
        if (rErr) throw rErr;

        renderReport(filteredStudents, records, categories, selectedBadSubs);
        
        loading.style.display = 'none';
        resultSec.style.display = 'block';
        document.getElementById('print-btn').style.display = 'inline-block';

    } catch (err) {
        console.error(err);
        loading.style.display = 'none';
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
    }
}

function renderReport(students, records, categories, selectedBadSubs) {
    const tableHead = document.getElementById('table-head-row');
    const tableBody = document.getElementById('table-body');
    const tableFoot = document.getElementById('table-foot');
    const reportTitle = document.getElementById('report-title');
    const reportDate = document.getElementById('report-date');
    const countDisplay = document.getElementById('student-count-display');

    const now = new Date();
    reportDate.textContent = `출력 일시: ${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${now.getHours()}:${now.getMinutes()}`;

    // 헤더 구성
    tableHead.innerHTML = '<th>학번</th><th>성명</th>';
    categories.forEach(cat => {
        tableHead.innerHTML += `<th>${cat}</th>`;
    });
    tableHead.innerHTML += '<th>합계</th><th>최근 기록</th>';

    // 데이터 집계
    const stats = students.map(s => {
        const studentRecs = records.filter(r => r.student_pid === s.pid);
        const row = {
            id: s.student_id,
            name: s.name,
            counts: {},
            total: 0
        };
        
        categories.forEach(cat => {
            let count = 0;
            if (cat === '조퇴') {
                count = studentRecs.filter(r => r.category.includes('조퇴')).length;
            } else if (cat === '외출') {
                count = studentRecs.filter(r => r.category.includes('외출')).length;
            } else if (cat === '잘한 일') {
                count = studentRecs.filter(r => r.is_positive === true && !r.category.includes('근태')).length;
            } else if (cat === '못한 일') {
                // 세부 항목 필터링 적용
                count = studentRecs.filter(r => {
                    if (r.is_positive !== false || r.category.includes('근태')) return false;
                    // 선택된 세부 항목이 있는지 확인 (쉼표로 구분된 여러 항목 지원)
                    const recordCats = r.category.split(',').map(s => s.trim());
                    return recordCats.some(rc => selectedBadSubs.includes(rc));
                }).length;
            } else {
                count = studentRecs.filter(r => r.category === cat).length;
            }
            row.counts[cat] = count;
            row.total += count;
        });

        // 최근 기록 시간 산출
        if (studentRecs.length > 0) {
            const latest = studentRecs.reduce((max, r) => r.created_at > max ? r.created_at : max, studentRecs[0].created_at);
            row.latest_time = latest;
        } else {
            row.latest_time = null;
        }

        return row;
    }).filter(s => s.total > 0); // 기록이 0인 학생 제외

    // 정렬 적용
    if (currentSortMode === 'latest') {
        stats.sort((a, b) => {
            if (!a.latest_time) return 1;
            if (!b.latest_time) return -1;
            return b.latest_time.localeCompare(a.latest_time);
        });
    } else {
        // 기본 학번순 (stats 이미 학번순으로 정렬된 학생들로부터 생성됨)
        stats.sort((a, b) => a.id.localeCompare(b.id));
    }

    // 총 인원수 표시
    if (countDisplay) {
        countDisplay.textContent = `총 ${stats.length}명`;
    }

    // 바디 렌더링
    tableBody.innerHTML = '';
    stats.forEach(s => {
        const student = students.find(st => st.pid === s.pid);
        
        // 시간 포맷팅 (MM-DD HH:mm)
        let timeStr = '-';
        if (s.latest_time) {
            const dt = new Date(s.latest_time);
            timeStr = `${(dt.getMonth()+1).toString().padStart(2, '0')}-${dt.getDate().toString().padStart(2, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
        }

        let html = `<tr data-pid="${s.pid}">
            <td>${s.id}</td>
            <td class="student-name-link" onclick="window.showPhotoModalByPid('${s.pid}')">${s.name}</td>`;
        categories.forEach(cat => {
            html += `<td>${s.counts[cat] || 0}</td>`;
        });
        html += `<td>${s.total}</td><td>${timeStr}</td></tr>`;
        tableBody.innerHTML += html;
    });

    // 전역 함수로 노출 (onclick 용)
    window.showPhotoModalByPid = (pid) => {
        const student = students.find(st => st.pid === pid);
        if (student) showPhotoModal(student);
    };

    // 푸터 (합계)
    tableFoot.innerHTML = '';
    let footHtml = `<tr style="background:#f1f5f9"><td colspan="2">합계</td>`;
    let grandTotal = 0;
    categories.forEach(cat => {
        const colSum = stats.reduce((acc, s) => acc + (s.counts[cat] || 0), 0);
        footHtml += `<td>${colSum}</td>`;
        grandTotal += colSum;
    });
    footHtml += `<td>${grandTotal}</td></tr>`;
    tableFoot.innerHTML = footHtml;
}

function showPhotoModal(student) {
    const modal = document.getElementById('photo-modal');
    const photoImg = document.getElementById('modal-photo');
    const infoText = document.getElementById('modal-student-info');

    infoText.textContent = `${student.student_id} ${student.name}`;
    
    if (student.photo_url) {
        let finalUrl = student.photo_url;
        if (finalUrl.includes('drive.google.com')) {
            const fileId = finalUrl.split('id=')[1] || finalUrl.split('/d/')[1]?.split('/')[0];
            if (fileId) finalUrl = `https://lh3.googleusercontent.com/d/${fileId}=s500`;
        }
        photoImg.src = finalUrl;
    } else {
        photoImg.src = './default.png';
    }

    modal.style.display = 'flex';
}
