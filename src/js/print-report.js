import { supabase, getTeacherProfile, getCurrentTeacherEmail } from './api.js';
import * as XLSX from 'xlsx';

let currentTeacher = null;
let allStudents = [];
let allRecords = [];

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

        renderReport(filteredStudents, records, categories);
        
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

function renderReport(students, records, categories) {
    const tableHead = document.getElementById('table-head-row');
    const tableBody = document.getElementById('table-body');
    const tableFoot = document.getElementById('table-foot');
    const reportTitle = document.getElementById('report-title');
    const reportDate = document.getElementById('report-date');

    const now = new Date();
    reportDate.textContent = `출력 일시: ${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${now.getHours()}:${now.getMinutes()}`;

    // 헤더 구성
    tableHead.innerHTML = '<th>번호</th><th>성명</th>';
    categories.forEach(cat => {
        tableHead.innerHTML += `<th>${cat}</th>`;
    });
    tableHead.innerHTML += '<th>합계</th>';

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
            if (cat === '근태') {
                count = studentRecs.filter(r => r.category.includes('근태')).length;
            } else if (cat === '잘한 일') {
                count = studentRecs.filter(r => r.is_positive === true && !r.category.includes('근태')).length;
            } else if (cat === '못한 일') {
                count = studentRecs.filter(r => r.is_positive === false && !r.category.includes('근태')).length;
            } else {
                count = studentRecs.filter(r => r.category === cat).length;
            }
            row.counts[cat] = count;
            row.total += count;
        });
        return row;
    });

    // 바디 렌더링
    tableBody.innerHTML = '';
    stats.forEach(s => {
        let html = `<tr><td>${s.id}</td><td>${s.name}</td>`;
        categories.forEach(cat => {
            html += `<td>${s.counts[cat] || 0}</td>`;
        });
        html += `<td>${s.total}</td></tr>`;
        tableBody.innerHTML += html;
    });

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
