import { fetchGroupRecords, fetchAllStudents, getTeacherProfile } from './api.js';
import { extractDriveId, getThumbnailUrl, formatRelativeWithPeriod } from './utils.js';
import CryptoJS from 'crypto-js';
import { API_CONFIG } from './config.js';

let allRecords = []; // 로드된 전체 기록 데이터 보관
let currentSort = 'num'; // 현재 정렬 상태 ('num', 'time', 'my-num', 'my-time')
let teacherClass = null; // 로그인된 선생님의 담당 학급 (예: "3-4")

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    const classNum = urlParams.get('class');

    await initTeacherAuth(); // 선생님 인증 및 학급 정보 로드
    updateTitle(grade, classNum);
    setupSortControls();

    await loadRecords(grade, classNum);
});

async function initTeacherAuth() {
    const encrypted = localStorage.getItem('teacher_auth_token');
    if (!encrypted) return;

    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, API_CONFIG.SECRET_KEY);
        const email = bytes.toString(CryptoJS.enc.Utf8);
        if (!email) return;

        const profile = await getTeacherProfile(email);
        if (profile && profile.assigned_class) {
            teacherClass = profile.assigned_class;
            // 담당 학반이 있는 경우 전용 버튼 노출
            document.getElementById('sort-my-num').style.display = 'inline-block';
            document.getElementById('sort-my-time').style.display = 'inline-block';
        }
    } catch (e) {
        console.error("Auth initialization failed:", e);
    }
}

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
    const btnMyNum = document.getElementById('sort-my-num');
    const btnMyTime = document.getElementById('sort-my-time');

    const updateActiveBtn = (sort) => {
        [btnNum, btnTime, btnMyNum, btnMyTime].forEach(btn => btn.classList.remove('active'));
        if (sort === 'num') btnNum.classList.add('active');
        else if (sort === 'time') btnTime.classList.add('active');
        else if (sort === 'my-num') btnMyNum.classList.add('active');
        else if (sort === 'my-time') btnMyTime.classList.add('active');
    };

    btnNum.addEventListener('click', () => {
        if (currentSort === 'num') return;
        currentSort = 'num';
        updateActiveBtn(currentSort);
        renderRecords();
    });

    btnTime.addEventListener('click', () => {
        if (currentSort === 'time') return;
        currentSort = 'time';
        updateActiveBtn(currentSort);
        renderRecords();
    });

    btnMyNum.addEventListener('click', () => {
        if (currentSort === 'my-num') return;
        currentSort = 'my-num';
        updateActiveBtn(currentSort);
        renderRecords();
    });

    btnMyTime.addEventListener('click', () => {
        if (currentSort === 'my-time') return;
        currentSort = 'my-time';
        updateActiveBtn(currentSort);
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

        countEl.textContent = allRecords.length;

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

    // 1. 필터링 (우리반 모드일 경우)
    let filtered = [...allRecords];
    if (currentSort.startsWith('my-') && teacherClass) {
        const classPrefix = teacherClass.replace('-', '');
        filtered = allRecords.filter(r => String(r.num).startsWith(classPrefix));
    }

    // 2. 데이터 정렬
    const sorted = filtered.sort((a, b) => {
        if (currentSort === 'num' || currentSort === 'my-num') {
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

    // 건수 업데이트 (필터링된 결과 기준)
    const countEl = document.getElementById('total-count');
    countEl.textContent = sorted.length;
}

// 레코드 카드 생성
function createRecordCard(record) {
    const div = document.createElement('div');
    div.className = 'log-card';

    // 시간 포맷
    const relativeTime = formatRelativeWithPeriod(record.time);
    const d = new Date(record.time);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = days[d.getDay()];
    const absoluteTime = `${d.getMonth() + 1}/${d.getDate()}(${dayName}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const fullTimeStr = `${relativeTime} (${absoluteTime})`;

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
                <img src="${record.photo || ''}" alt="${record.name}" class="total-rec-photo" 
                     onerror="if(!this.dataset.retry){this.dataset.retry=true; const fid='${extractDriveId(record.photo)}'; if(fid) this.src='https://drive.google.com/thumbnail?id='+fid+'&sz=w500';} else {this.src='https://ssl.gstatic.com/ui/v1/solid-track/common/identity/static/avatar/ad_default_user.png'}">
            </div>
            <div class="record-info-area">
                <div class="log-header">
                    <a href="record.html?num=${record.num}&name=${encodeURIComponent(record.name)}" class="student-info-link">
                        <span class="student-info">${record.num} ${record.name}</span>
                    </a>
                </div>
                <div class="log-content">${record.detail || '상세 내용 없음'}</div>
                <div class="log-footer-time">${fullTimeStr}</div>
                <div class="deed-tags">
                    ${record.photos && record.photos.length > 0 ? `<span class="tag" style="background: #f0f0f0; color: #555; border: 1px solid #ccc;">📷 사진</span>` : ''}
                    ${record.good && !['기록', '생활기록', '일반'].includes(record.good) ? `<span class="tag tag-good">${record.good}</span>` : ''}
                    ${record.bad && !['기록', '생활기록', '일반'].includes(record.bad) ? `<span class="tag tag-bad">${record.bad}</span>` : ''}
                </div>
            </div>
        </div>
    `;
    return div;
}
