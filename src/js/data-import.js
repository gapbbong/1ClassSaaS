import { supabase } from './supabase.js';
import { ImageProcessor } from './data-import/image-processor.js';
import { UI } from './shared/ui.js';

// 상태 관리
let state = {
    school: null,
    previewStudents: [],
    previewPhotos: []
};

/**
 * 초기화 단계: URL 파라미터 또는 세션에서 학교 정보 확인
 */
async function init() {
    try {
        // 실제로는 도메인 기반 식별 로직이 들어갈 자리
        const { data: schools, error } = await supabase.from('schools').select('*').limit(1);
        
        if (error) throw error;

        if (schools && schools.length > 0) {
            state.school = schools[0];
            const nameEl = document.getElementById('school-name');
            const badgeEl = document.getElementById('school-info-badge');
            
            if (nameEl) nameEl.innerText = state.school.name || '알 수 없는 학교';
            if (badgeEl) {
                const spinner = badgeEl.querySelector('.loading-spinner');
                if (spinner) spinner.classList.add('hidden');
                badgeEl.classList.replace('bg-light', 'bg-white');
                badgeEl.classList.add('border');
            }

            // 학번 자릿수 가이드 업데이트
            const idLen = state.school.settings?.student_id_length || 4;
            const guideIdLen = document.getElementById('expected-id-length');
            if (guideIdLen) guideIdLen.innerText = idLen;

            UI.toast(`${state.school.name || '학교'} 데이터 센터에 연결되었습니다.`, 'success');
        } else {
            document.getElementById('school-name').innerText = '학교 정보 없음';
            UI.toast('등록된 학교 정보를 찾을 수 없습니다.', 'error');
            setTimeout(() => location.href = 'onboarding.html', 3000);
        }
    } catch (err) {
        console.error(err);
        UI.toast('서버 연결 중 오류가 발생했습니다.', 'error');
    }

    setupEventListeners();
}

function setupEventListeners() {
    // 엑셀 업로드 영역
    const excelZone = document.getElementById('excel-drop-zone');
    const excelInput = document.getElementById('excel-input');

    if (excelZone) excelZone.onclick = () => excelInput.click();
    if (excelInput) excelInput.onchange = (e) => handleExcelFile(e.target.files[0]);

    // 사진 대량 매핑 영역
    const photoZone = document.getElementById('photo-drop-zone');
    const photoInput = document.getElementById('photo-input');

    if (photoZone) photoZone.onclick = () => photoInput.click();
    if (photoInput) photoInput.onchange = (e) => handlePhotoFiles(e.target.files);

    // 드래그 앤 드롭 지원
    [excelZone, photoZone].forEach(zone => {
        if (!zone) return;
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.borderColor = '#6366f1';
            zone.style.background = '#f5f3ff';
        });
        zone.addEventListener('dragleave', () => {
            zone.style.borderColor = '#e2e8f0';
            zone.style.background = '#fff';
        });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.borderColor = '#e2e8f0';
            zone.style.background = '#fff';
            const files = e.dataTransfer.files;
            if (zone.id === 'excel-drop-zone') {
                handleExcelFile(files[0]);
            } else {
                handlePhotoFiles(files);
            }
        });
    });

    // 템플릿 다운로드 버튼
    document.getElementById('btn-download-template')?.addEventListener('click', downloadExcelTemplate);

    // 저장 버튼들
    document.getElementById('btn-save-excel')?.addEventListener('click', saveExcelData);
    document.getElementById('btn-cancel-excel')?.addEventListener('click', () => location.reload());
}

/**
 * 엑셀 파일 처리 및 파싱
 */
function handleExcelFile(file) {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/)) {
        return UI.toast('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.', 'warning');
    }
    
    UI.toast('파일을 분석하는 중입니다...', 'info');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const json = XLSX.utils.sheet_to_json(worksheet);
            if (json.length === 0) throw new Error('데이터가 비어있습니다.');
            
            renderExcelPreview(json);
            UI.toast(`${json.length}명의 학생 데이터를 확인했습니다.`, 'success');
        } catch (err) {
            UI.toast('엑셀 파일 분석에 실패했습니다.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

/**
 * 엑셀 미리보기 렌더링
 */
function renderExcelPreview(data) {
    const body = document.getElementById('excel-preview-body');
    body.innerHTML = '';
    
    state.previewStudents = data.map(row => ({
        grade: row['학년'] || row['Grade'] || '',
        class_nm: row['반'] || row['Class'] || '',
        number: row['번호'] || row['No'] || '',
        name: row['성명'] || row['이름'] || row['Name'] || '',
        student_id: row['학번'] || row['Student ID'] || ''
    }));

    state.previewStudents.slice(0, 50).forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.grade}</td><td>${s.class_nm}</td><td>${s.number}</td>
            <td class="fw-bold">${s.student_id}</td><td>${s.name}</td>
            <td><span class="status-badge bg-success-subtle text-success">준비됨</span></td>
        `;
        body.appendChild(tr);
    });

    document.getElementById('excel-drop-zone').classList.add('hidden');
    document.getElementById('excel-preview-container').classList.remove('hidden');
    document.getElementById('excel-preview-container').scrollIntoView({ behavior: 'smooth' });
}

/**
 * 학생 데이터 저장
 */
async function saveExcelData() {
    UI.showLoading('btn-save-excel', '데이터 저장 중...');
    
    try {
        // 1. 학급 정보가 없는 경우 자동 생성 로직 (나중 구현)
        // 2. 학생 정보 벌크 Insert
        const studentsToInsert = state.previewStudents.map(s => ({
            school_id: state.school.id,
            grade: parseInt(s.grade),
            class_nm: s.class_nm.toString(),
            number: parseInt(s.number),
            name: s.name,
            student_id: s.student_id.toString()
        }));

        const { error } = await supabase.from('students').insert(studentsToInsert);
        if (error) throw error;

        UI.toast('명렬 저장이 완료되었습니다!', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch (err) {
        console.error(err);
        UI.toast('저장 중 오류가 발생했습니다.', 'error');
        UI.hideLoading('btn-save-excel', '전체 데이터 저장하기');
    }
}

/**
 * 사진 파일들 처리 (리사이징 및 미리보기)
 */
async function handlePhotoFiles(files) {
    if (!files || files.length === 0) return;

    const previewGrid = document.getElementById('photo-preview-grid');
    previewGrid.innerHTML = `
        <div class="text-center py-5 w-100 animate__animated animate__fadeIn">
            <div class="loading-spinner mx-auto mb-3"></div>
            <p class="fw-bold text-primary mb-1">지능형 매핑 엔진 가동 중...</p>
            <p class="text-muted small">사진을 분석하여 학급 명렬과 대조하고 있습니다.</p>
        </div>
    `;
    
    document.getElementById('photo-drop-zone')?.classList.add('hidden');
    document.getElementById('photo-preview-container')?.classList.remove('hidden');

    const photos = [];
    for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;

        try {
            const idLen = state.school.settings?.student_id_length || 4;
            const resizedBlob = await ImageProcessor.resize(file);
            const studentId = ImageProcessor.extractKey(file.name, idLen);
            
            photos.push({
                originalName: file.name,
                originalSize: file.size, // 원본 용량 기록
                studentId: studentId,
                blob: resizedBlob,
                previewUrl: URL.createObjectURL(resizedBlob)
            });
        } catch (err) {
            console.error(`이미지 처리 실패: ${file.name}`, err);
        }
    }

    state.previewPhotos = photos;
    renderPhotoPreview();
    UI.toast(`${photos.length}장의 사진이 스마트하게 매칭 준비되었습니다.`, 'success');
}

/**
 * 사진 미리보기 그리드 렌더링
 */
function renderPhotoPreview() {
    const grid = document.getElementById('photo-preview-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (state.previewPhotos.length === 0) {
        grid.innerHTML = '<div class="text-center py-5 text-muted w-100">분석된 사진이 없습니다.</div>';
        return;
    }

    state.previewPhotos.forEach((p, idx) => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3 animate__animated animate__fadeInUp';
        col.style.animationDelay = `${idx * 0.05}s`;
        
        col.innerHTML = `
            <div class="card border-0 shadow-sm h-100 data-card p-0 overflow-hidden" style="border-radius: 1rem; border: 1px solid rgba(0,0,0,0.05) !important;">
                <div class="position-absolute top-0 end-0 m-2 d-flex flex-column align-items-end gap-1">
                    <span class="badge bg-secondary bg-opacity-75 blur-light rounded-pill px-2 py-1" style="font-size: 0.6rem; backdrop-filter: blur(4px); text-decoration: line-through;">
                        ${(p.originalSize / 1024).toFixed(0)}KB
                    </span>
                    <span class="badge bg-success blur-light rounded-pill px-2 py-1 small" style="font-size: 0.7rem; backdrop-filter: blur(4px);">
                        <i class="bi bi-arrow-down-short"></i> ${(p.blob.size / 1024).toFixed(0)}KB
                    </span>
                </div>
                <img src="${p.previewUrl}" class="card-img-top" style="height: 160px; object-fit: cover; background: #f8fafc;">
                <div class="card-body p-3 text-center bg-white">
                    <div class="small text-muted mb-1" style="font-size: 0.7rem; display: flex; justify-content: center; align-items: center; gap: 4px;">
                        <i class="bi bi-lightning-charge-fill text-warning"></i> 최적화 완료
                    </div>
                    <div class="fw-bold text-dark mb-2" style="letter-spacing: -0.5px;">학번: ${p.studentId}</div>
                    <button class="btn btn-sm btn-light border py-1 w-100 text-primary fw-bold" style="font-size: 0.75rem; border-radius: 0.5rem;" onclick="handleEditPhoto(${idx})">
                        <i class="bi bi-pencil-square"></i> 사진 교체
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });

    const badge = document.getElementById('photo-count-badge');
    if (badge) badge.innerText = `${state.previewPhotos.length}장 선택됨`;
}

/**
 * 개별 사진 수정 처리
 */
window.handleEditPhoto = (idx) => {
    const photo = state.previewPhotos[idx];
    const modalEl = document.getElementById('edit-photo-modal');
    if (!modalEl) return;
    
    // 기존 모달 인스턴스가 있다면 가져오고, 없으면 생성
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) modal = new bootstrap.Modal(modalEl);
    
    document.getElementById('modal-photo-preview').src = photo.previewUrl;
    document.getElementById('modal-student-info').innerText = `${photo.studentId} 학생 사진 교체`;
    
    const modalInput = document.getElementById('modal-photo-input');
    if (modalInput) {
        modalInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                UI.toast('선택한 사진을 실시간 리사이징 중입니다...', 'info');
                try {
                    const resized = await ImageProcessor.resize(file);
                    state.previewPhotos[idx].originalSize = file.size; // 교체된 파일의 원본 용량 업데이트
                    state.previewPhotos[idx].blob = resized;
                    state.previewPhotos[idx].previewUrl = URL.createObjectURL(resized);
                    renderPhotoPreview();
                    modal.hide();
                    UI.toast(`${photo.studentId} 학생의 사진이 교체되었습니다.`, 'success');
                } catch (err) {
                    UI.toast('사진 처리 중 오류가 발생했습니다.', 'error');
                }
            }
        };
    }
    
    modal.show();
};

/**
 * 나이스 호환 스마트 엑셀 템플릿 생성 및 다운로드
 */
function downloadExcelTemplate() {
    try {
        UI.toast('템플릿을 생성 중입니다...', 'info');

        // 헤더 및 예시 데이터 정의
        const data = [
            ['학년', '반', '번호', '성명', '학번'],
            ['1', '1', '1', '김원클(예시)', '10101'],
            ['1', '1', '2', '이원클(예시)', '10102'],
            ['3', '12', '25', '박원클(예시)', '31225']
        ];

        // 워크북 및 시트 생성
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        // 컬럼 너비 설정
        ws['!cols'] = [
            { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 15 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "학생명렬_양식");

        // 파일 이름 생성 (학교명이 있으면 포함)
        const schoolPart = state.school ? `_${state.school.name}` : '';
        const fileName = `1Class_학생명렬_템플릿${schoolPart}.xlsx`;

        // 다운로드 실행
        XLSX.writeFile(wb, fileName);
        
        UI.toast('템플릿 다운로드가 시작되었습니다.', 'success');
    } catch (err) {
        console.error(err);
        UI.toast('템플릿 생성 중 오류가 발생했습니다.', 'error');
    }
}

// 초기화 실행
init();
