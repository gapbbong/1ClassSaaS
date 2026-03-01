import { fetchGroupRecords, fetchAllStudents } from './api.js';
import { extractDriveId, getThumbnailUrl, formatRelativeWithPeriod } from './utils.js';

let allRecords = []; // 로드된 전체 기록 데이터 보관
let currentSort = 'num'; // 현재 정렬 상태 ('num' or 'time')

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    const classNum = urlParams.get('class');

    updateTitle(grade, classNum);
    setupSortControls();

    await loadRecords(grade, classNum);
});

// 페이지 제목 업데이트 (학년/반 표시)
function updateTitle(grade, classNum) {
    const titleEl = document.getElementById('page-title');
    if (grade && classNum) {
        titleEl.textContent = `${grade}학년 ${classNum}반 기록 모아보기`;
    } else {
        titleEl.textContent = '전체 기록 모아보기';
    }
}

// 정렬 버튼 이벤트 설정
function setupSortControls() {
    const btnNum = document.getElementById('sort-num');
    const btnTime = document.getElementById('sort-time');

    btnNum.addEventListener('click', () => {
        if (currentSort === 'num') return;
        currentSort = 'num';
        btnNum.classList.add('active');
        btnTime.classList.remove('active');
        renderRecords();
    });

    btnTime.addEventListener('click', () => {
        if (currentSort === 'time') return;
        currentSort = 'time';
        btnTime.classList.add('active');
        btnNum.classList.remove('active');
        renderRecords();
    });
}

// 데이터 로드
async function loadRecords(grade, classNum) {
    const container = document.getElementById('log-container');
    const countEl = document.getElementById('total-count');

    try {
        // 로딩 애니메이션 시작
        container.innerHTML = '';
        container.classList.add('loading-records');

        // 기록 데이터 호출 (API에서 이름/사진이 포함되어 옴)
        const records = await fetchGroupRecords(grade, classNum);

        allRecords = records;

        // 로딩 종료
        container.classList.remove('loading-records');

        countEl.textContent = `총 ${allRecords.length}건`;

        if (allRecords.length === 0) {
            container.innerHTML = '<div class="loading-msg">표시할 기록이 없습니다.</div>';
            return;
        }

        renderRecords();
    } catch (error) {
        console.error(error);
        container.classList.remove('loading-records');
        container.innerHTML = '<div class="loading-msg">데이터 로드에 실패했습니다.</div>';
        countEl.textContent = '로드 실패';
    }
}

// 데이터 렌더링
function renderRecords() {
    const container = document.getElementById('log-container');
    container.innerHTML = '';

    // 데이터 정렬
    const sorted = [...allRecords].sort((a, b) => {
        if (currentSort === 'num') {
            // 학번 오름차순
            return String(a.num).localeCompare(String(b.num));
        } else {
            // 시간 내림차순 (최신순)
            return new Date(b.time) - new Date(a.time);
        }
    });

    sorted.forEach(record => {
        const card = createRecordCard(record);
        container.appendChild(card);
    });
}

// 레코드 카드 생성
function createRecordCard(record) {
    const div = document.createElement('div');
    div.className = 'log-card';

    // 시간 포맷
    const timeStr = formatRelativeWithPeriod(record.time);

    // 기록 유형에 따른 배경색 클래스 결정
    let typeClass = 'type-neutral';
    if (record.bad && !['기록', '생활기록', '일반'].includes(record.bad)) {
        typeClass = 'type-bad';
    } else if (record.good && !['기록', '생활기록', '일반'].includes(record.good)) {
        typeClass = 'type-good';
    }

    div.innerHTML = `
        <div class="card-inner">
            <div class="student-photo-area">
                <img src="${photoUrl}" alt="${record.name}" class="student-photo" 
                     onerror="if(!this.dataset.retry){this.dataset.retry=true; const fid='${extractDriveId(record.photo)}'; if(fid) this.src='https://drive.google.com/thumbnail?id='+fid+'&sz=w500';} else {this.src='https://ssl.gstatic.com/ui/v1/solid-track/common/identity/static/avatar/ad_default_user.png'}">
                <div class="photo-badge ${typeClass}">${timeStr}</div>
            </div>
            <div class="record-info-area">
                <div class="log-header">
                    <span class="student-info">${record.num} ${record.name}</span>
                    <span class="log-time" style="display:none;">${timeStr}</span>
                </div>
                <div class="log-content">${record.detail || '상세 내용 없음'}</div>
                <div class="deed-tags">
                    ${record.good && !['기록', '생활기록', '일반'].includes(record.good) ? `<span class="tag tag-good">${record.good}</span>` : ''}
                    ${record.bad && !['기록', '생활기록', '일반'].includes(record.bad) ? `<span class="tag tag-bad">${record.bad}</span>` : ''}
                </div>
            </div>
        </div>
    `;
    return div;
}
