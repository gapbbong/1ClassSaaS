import { supabase } from './supabase.js';

document.addEventListener("DOMContentLoaded", async () => {
    initClock();
    await checkAuth();
    loadTodayRecords();
    subscribeToChanges();
    initLogout();
});

// 권한 체킹 (임시로 넘어가거나, localStorage 토큰 체킹)
async function checkAuth() {
    // 실제 운영 시 로그인한 교사 이메일이 keeper@kse.hs.kr 인지 확인
    // 현재는 바로 진행
}

// 상단 타이머 및 날짜 표시
function initClock() {
    const timeEl = document.getElementById("current-time");
    const dateEl = document.getElementById("current-date");

    function updateClock() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const day = days[now.getDay()];

        dateEl.innerText = `${yyyy}년 ${mm}월 ${dd}일 (${day})`;

        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const sec = String(now.getSeconds()).padStart(2, '0');
        timeEl.innerText = `${hh}:${min}:${sec}`;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

// 오늘 날짜의 조퇴/외출 데이터 로드 (KST 기준)
async function loadTodayRecords() {
    document.getElementById("loading-view").style.display = "block";
    document.getElementById("empty-view").style.display = "none";
    document.getElementById("record-grid").innerHTML = "";

    const today = new Date();
    // 한국 시간 기준으로 오늘 00:00:00 ~ 23:59:59 범위 설정
    const kstOffset = 9 * 60 * 60 * 1000;
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

    // ISO 문자열 반환 시 UTC 기준이므로, KST에 맞춘 쿼리를 위해서는 변환 필요 
    // Supabase created_at은 UTC로 저장되기에, 정확한 오늘 날짜 필터링 적용
    // 간단히 KST 시작/끝 시간을 UTC로 변환해서 조회
    const startUtc = new Date(startOfToday.getTime() - kstOffset).toISOString();
    const endUtc = new Date(endOfToday.getTime() - kstOffset).toISOString();

    const { data: records, error } = await supabase
        .from('life_records')
        .select(`
            id, created_at, category, content, teacher_name,
            students!inner ( student_id, name, photo_url, class_info )
        `)
        .eq('category', '근태')
        .or('content.ilike.%조퇴%,content.ilike.%외출%')
        .gte('created_at', startUtc)
        .lte('created_at', endUtc)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("외출 기록 로드 실패:", error);
        document.getElementById("loading-view").innerText = "데이터를 불러오는 데 실패했습니다.";
        return;
    }

    renderRecords(records || []);
}

// 화면 렌더링
function renderRecords(records) {
    document.getElementById("loading-view").style.display = "none";

    if (!records || records.length === 0) {
        document.getElementById("empty-view").style.display = "block";
        document.getElementById("out-count").innerText = "0";
        document.getElementById("early-count").innerText = "0";
        return;
    }

    let outCount = 0;
    let earlyCount = 0;
    const grid = document.getElementById("record-grid");
    grid.innerHTML = "";

    records.forEach(r => {
        let isOut = r.content.includes("외출");
        let isEarly = r.content.includes("조퇴");

        if (isOut) outCount++;
        else if (isEarly) earlyCount++;

        const typeClass = isOut ? 'type-out' : 'type-early';
        const typeLabel = isOut ? '🏃 외출' : '🏠 조퇴';

        // 날짜/시간 포맷 (만들어진 시간 = 외출증 발급 시간)
        const recordDate = new Date(r.created_at);
        const timeStr = `${String(recordDate.getHours()).padStart(2, '0')}:${String(recordDate.getMinutes()).padStart(2, '0')} 발급`;

        const studentInfo = r.students || {};

        grid.innerHTML += `
            <div class="record-card ${typeClass}">
                <div class="card-header">
                    <span class="card-type">${typeLabel}</span>
                    <span class="card-time">${timeStr}</span>
                </div>
                <div class="card-class">${studentInfo.class_info || '학급 미상'}</div>
                <div class="card-student">${studentInfo.name || '알 수 없음'} <span style="font-size: 1.8rem; color:#64748b;">(${studentInfo.student_id || ''})</span></div>
                <div class="card-detail">${r.content}</div>
                <div style="text-align:right; font-size:1.1rem; color:#94a3b8; margin-top:10px;">결재 교사: ${r.teacher_name}</div>
            </div>
        `;
    });

    document.getElementById("out-count").innerText = outCount;
    document.getElementById("early-count").innerText = earlyCount;
}

// 실시간 자동 갱신 (담임이 작성하면 화면에 즉각 표시)
function subscribeToChanges() {
    supabase
        .channel('public:life_records')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'life_records' }, payload => {
            const newRecord = payload.new;
            if (newRecord.category === '근태' && (newRecord.content.includes('외출') || newRecord.content.includes('조퇴'))) {
                // 변화가 생기면 전체 재로드 (복잡도 감소)
                loadTodayRecords();
            }
        })
        .subscribe();
}

function initLogout() {
    document.getElementById("logout-btn").addEventListener("click", () => {
        if (confirm("지킴이 대시보드에서 로그아웃 하시겠습니까?")) {
            localStorage.removeItem("teacher_auth_token");
            location.href = "index.html";
        }
    });
}
