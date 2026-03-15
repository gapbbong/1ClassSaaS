import { searchSchool, getClassInfo } from './neis-api.js';
import { supabase } from './supabase.js';

// 상태 관리
let state = {
    step: 1,
    school: null,
    classes: [],
    domain: '',
    authMode: 'email'
};

// DOM 요소
const steps = {
    1: document.getElementById('step-1'),
    2: document.getElementById('step-2'),
    3: document.getElementById('step-3')
};
const dots = {
    1: document.getElementById('dot-1'),
    2: document.getElementById('dot-2'),
    3: document.getElementById('dot-3')
};

// 엔터키 전역 조작 (바쁜 선생님들을 위한 '짬밥' 있는 UX)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const activeTab = Object.values(steps).find(s => s && !s.classList.contains('hidden'));
        if (!activeTab) return;

        // 특별히 검색 입력창이 아닐 때만 '다음' 진행
        if (e.target.id !== 'search-input') {
            const nextBtn = activeTab.querySelector('button:not([disabled]):not(.hidden)');
            if (nextBtn) {
                e.preventDefault();
                nextBtn.click();
            }
        }
    }
});

/**
 * 단계 변경 함수
 */
function goToStep(nextStep) {
    steps[state.step].classList.add('hidden');
    dots[state.step].classList.remove('active');
    
    state.step = nextStep;
    
    steps[state.step].classList.remove('hidden');
    dots[state.step].classList.add('active');
    
    // 단계별 애니메이션 재실행
    steps[state.step].classList.add('animate__animated', 'animate__fadeInRight');
}

/**
 * 학교 검색 실행
 */
async function handleSearch() {
    const input = document.getElementById('search-input').value.trim();
    const region = document.getElementById('region-select').value;
    
    if (!input) return alert('학교명을 입력해주세요.');
    if (input.length < 2) return alert('최소 두 글자 이상 입력해주세요.');

    const resultsDiv = document.getElementById('search-results');
    resultsDiv.innerHTML = '<div class="text-center py-4"><div class="loading-spinner mx-auto"></div><p class="mt-2 text-muted">나이스 정보를 조회 중입니다...</p></div>';

    const schools = await searchSchool(input, region);
    
    if (schools && schools.length > 0) {
        // 결과가 여러 개일 경우 지역 필터 영역 노출 (사용자 편의성)
        const filterArea = document.getElementById('region-filter-area');
        if (schools.length > 1 && filterArea) {
            filterArea.classList.remove('hidden');
        } else if (filterArea) {
            filterArea.classList.add('hidden');
        }

        resultsDiv.innerHTML = `
            <p class="small fw-bold mb-2 text-primary animate__animated animate__fadeIn">
                <i class="bi bi-list-check"></i> ${schools.length}개의 학교가 검색되었습니다. 정확한 학교를 선택해주세요:
            </p>
            <div class="search-list" style="max-height: 300px; overflow-y: auto;">
                ${schools.map((s, idx) => `
                    <div class="school-item p-3 border mb-2" data-idx="${idx}" style="cursor: pointer;">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-bold text-dark">${s.name}</div>
                                <div class="small text-muted" style="font-size: 0.8rem;">${s.region} | ${s.address}</div>
                            </div>
                            <i class="bi bi-chevron-right text-primary"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // 클릭 이벤트 등록
        document.querySelectorAll('.school-item').forEach(item => {
            item.addEventListener('click', async () => {
                const idx = item.getAttribute('data-idx');
                const school = schools[idx];
                state.school = school;

                // 시각적 피드백
                item.classList.add('bg-primary', 'text-white');
                const mutedText = item.querySelector('.text-muted');
                if (mutedText) mutedText.classList.replace('text-muted', 'text-white-50');
                const icon = item.querySelector('.bi');
                if (icon) icon.classList.replace('text-primary', 'text-white');

                // 로딩 표시
                const originalHtml = item.innerHTML;
                item.innerHTML = '<div class="text-center py-2"><div class="loading-spinner mx-auto" style="width:1.5rem; height:1.5rem; border-color:white; border-top-color:transparent;"></div><div class="small mt-1">학급 구조 분석 중...</div></div>';

                try {
                    const currentYear = new Date().getFullYear();
                    state.classes = await getClassInfo(school.atptCode, school.schoolCode, currentYear);
                    goToStep(2);
                } catch (err) {
                    console.error(err);
                    alert('학급 정보를 가져오는 중 오류가 발생했습니다.');
                    item.innerHTML = originalHtml;
                    item.classList.remove('bg-primary', 'text-white');
                }
            });
        });
    } else {
        resultsDiv.innerHTML = '<div class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle"></i> 학교를 찾을 수 없습니다.<br><small>지역을 확인하거나 이름을 바꿔 검색해보세요.</small></div>';
    }
}

// 도메인 입력 유효성 및 중복 체크 로직
const domainInput = document.getElementById('domain-input');
const checkMsg = document.getElementById('domain-check-msg');
const nextBtn = document.getElementById('next-to-3');

if (domainInput) {
    domainInput.addEventListener('input', async () => {
        const val = domainInput.value.toLowerCase().trim();
        domainInput.value = val; 

        const regex = /^[a-z0-9]+$/;
        if (val.length < 2) {
            checkMsg.innerText = '최소 2자 이상 입력해주세요.';
            checkMsg.className = 'small mt-1 fw-bold text-danger';
            nextBtn.disabled = true;
            return;
        }

        if (!regex.test(val)) {
            checkMsg.innerText = '영문 소문자와 숫자만 사용 가능합니다.';
            checkMsg.className = 'small mt-1 fw-bold text-danger';
            nextBtn.disabled = true;
            return;
        }

        checkMsg.innerText = '확인 중...';
        checkMsg.className = 'small mt-1 fw-bold text-muted';
        
        const { data, error } = await supabase
            .from('schools')
            .select('id')
            .eq('domain_prefix', val);

        if (error) {
            checkMsg.innerText = '오류 발생.';
            nextBtn.disabled = true;
            return;
        }

        if (data && data.length > 0) {
            checkMsg.innerText = '이미 사용 중인 주소입니다.';
            checkMsg.className = 'small mt-1 fw-bold text-danger';
            nextBtn.disabled = true;
        } else {
            checkMsg.innerText = '사용 가능한 주소입니다!';
            checkMsg.className = 'small mt-1 fw-bold text-success';
            nextBtn.disabled = false;
            state.domain = val;
        }
    });
}

// 이벤트 리스너 등록
const searchBtn = document.getElementById('search-btn');
if (searchBtn) searchBtn.addEventListener('click', handleSearch);
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
}

const nextTo3Btn = document.getElementById('next-to-3');
if (nextTo3Btn) {
    nextTo3Btn.addEventListener('click', () => {
        state.authMode = document.getElementById('auth-mode').value;
        
        // 학번 체계 자동 제안 로직
        // 각 학년별 학급 수 중 최대값이 10 이상인지 확인
        const classCountByGrade = {};
        state.classes.forEach(c => {
            classCountByGrade[c.grade] = (classCountByGrade[c.grade] || 0) + 1;
        });
        
        const maxClasses = Math.max(...Object.values(classCountByGrade), 0);
        const recommendedFormat = maxClasses >= 10 ? '5' : '4';
        
        // 요약 화면 세팅
        document.getElementById('summary-school').innerText = state.school.name;
        document.getElementById('summary-domain').innerText = `${state.domain}.1class.app`;
        document.getElementById('summary-classes').innerText = state.classes.length > 0 ? `${state.classes.length}개 학급 자동 구성` : '수동 구성 필요';
        
        const formatSelect = document.getElementById('student-id-format-select');
        if (formatSelect) {
            formatSelect.value = recommendedFormat;
            document.getElementById('summary-student-id-format').innerText = recommendedFormat === '5' ? '5자리 (예: 10101)' : '4자리 (예: 1101)';

            formatSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                document.getElementById('summary-student-id-format').innerText = val === '5' ? '5자리 (예: 10101)' : '4자리 (예: 1101)';
            });
        }

        // 버튼 텍스트 업데이트 (편의성)
        const nextBtn = document.getElementById('next-to-3');
        if (nextBtn) nextBtn.innerText = '결재 및 최종 단계로 (Enter)';

        goToStep(3);
    });
}

// 계정 방식 선택 (워크스페이스 vs 개인메일)
window.selectAccountType = (type) => {
    const ws = document.getElementById('acc-workspace');
    const ps = document.getElementById('acc-personal');
    const input = document.getElementById('teacher-account-type');
    if (!ws || !ps || !input) return;

    if (type === 'workspace') {
        ws.style.borderColor = '#6366f1';
        ws.style.backgroundColor = '#f5f7ff';
        ps.style.borderColor = '#eee';
        ps.style.backgroundColor = '#fff';
        input.value = 'workspace';
    } else {
        ps.style.borderColor = '#6366f1';
        ps.style.backgroundColor = '#f5f7ff';
        ws.style.borderColor = '#eee';
        ws.style.backgroundColor = '#fff';
        input.value = 'personal';
    }
};

// 결재 방식 선택 함수 (글로벌 노출)
window.selectPayment = (method) => {
    const tossCard = document.getElementById('pay-toss');
    const keyCard = document.getElementById('pay-key');
    const trialClassCard = document.getElementById('pay-trial-class');
    const trialSchoolCard = document.getElementById('pay-trial-school');
    const keyArea = document.getElementById('key-input-area');
    const finishBtn = document.getElementById('finish-onboarding');

    // 스타일 초기화
    [tossCard, keyCard, trialClassCard, trialSchoolCard].forEach(c => {
        if (c) {
            c.style.borderColor = '#eee';
            c.style.backgroundColor = '#fff';
        }
    });

    if (method === 'toss') {
        tossCard.style.borderColor = '#6366f1';
        tossCard.style.backgroundColor = '#f5f7ff';
        document.getElementById('method-toss').checked = true;
        keyArea.classList.add('hidden');
        finishBtn.disabled = false;
        finishBtn.innerText = '토스 페이로 결제하고 완료하기 (Enter)';
    } else if (method === 'key') {
        keyCard.style.borderColor = '#f59e0b';
        keyCard.style.backgroundColor = '#fffbeb';
        document.getElementById('method-key').checked = true;
        keyArea.classList.remove('hidden');
        const licenseInput = document.getElementById('license-key');
        if (licenseInput) licenseInput.focus();
        finishBtn.disabled = true;
        finishBtn.innerText = '라이선스 키 확인 및 완료 (Enter)';
    } else if (method === 'trial-class') {
        trialClassCard.style.borderColor = '#10b981';
        trialClassCard.style.backgroundColor = '#f0fdf4';
        document.getElementById('method-trial-class').checked = true;
        keyArea.classList.add('hidden');
        finishBtn.disabled = false;
        finishBtn.innerText = '한 학급 맛보기로 시작하기 (Enter)';
    } else if (method === 'trial-school') {
        trialSchoolCard.style.borderColor = '#10b981';
        trialSchoolCard.style.backgroundColor = '#f0fdf4';
        document.getElementById('method-trial-school').checked = true;
        keyArea.classList.add('hidden');
        finishBtn.disabled = false;
        finishBtn.innerText = '전체 학교 한 달 체험 시작하기 (Enter)';
    }
};

// 초기 설정 실행
document.addEventListener('DOMContentLoaded', () => {
    if (typeof selectAccountType === 'function') selectAccountType('workspace');
    
    const licenseInput = document.getElementById('license-key');
    if (licenseInput) {
        licenseInput.addEventListener('input', (e) => {
            const finishBtn = document.getElementById('finish-onboarding');
            if (finishBtn) finishBtn.disabled = e.target.value.trim().length < 8;
        });
    }

    // 관리자 정보 실시간 프리뷰 (버그 수정 및 UX 강화)
    const adminNameInput = document.getElementById('admin-name');
    const adminDeptInput = document.getElementById('admin-dept');
    const previewName = document.getElementById('preview-name');
    const previewDept = document.getElementById('preview-dept');

    if (adminNameInput && previewName) {
        adminNameInput.addEventListener('input', (e) => {
            previewName.innerText = e.target.value.trim() || '...';
        });
    }
    if (adminDeptInput && previewDept) {
        adminDeptInput.addEventListener('input', (e) => {
            previewDept.innerText = e.target.value.trim() || '...';
        });
    }
});

/**
 * 이메일 유효성 검사 유틸리티
 */
function isValidEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
}

const setupBtn = document.getElementById('setup-btn');
if (setupBtn) {
    setupBtn.addEventListener('click', async () => {
        const spinner = document.getElementById('setup-spinner');
        const text = document.getElementById('setup-text');
        
        spinner.classList.remove('hidden');
        text.innerText = '인프라 구축 중...';
        setupBtn.disabled = true;

        try {
            const loginMode = document.getElementById('login-session-mode').value;
            const studentIdLength = document.getElementById('student-id-format-select').value;
            const accountType = document.getElementById('teacher-account-type').value;

            // 관리자 정보 수집
            const adminName = document.getElementById('admin-name').value.trim();
            const adminDept = document.getElementById('admin-dept').value.trim();
            const adminEmail = document.getElementById('admin-email').value.trim();
            const adminPhone = document.getElementById('admin-phone').value.trim();

            if (!adminName || !adminDept || !adminEmail || !adminPhone) {
                alert('동료 선생님들께 든든한 가이드가 되어주실 수 있도록\n관리자 정보를 모두 입력해주세요. 😊');
                spinner.classList.add('hidden');
                text.innerText = '다시 시도';
                setupBtn.disabled = false;
                return;
            }

            if (!isValidEmail(adminEmail)) {
                alert('유효한 이메일 주소를 형식에 맞게 입력해주세요.\n(예: teacher@school.go.kr)');
                spinner.classList.add('hidden');
                text.innerText = '다시 시도';
                setupBtn.disabled = false;
                return;
            }

            const { data: newSchool, error: schoolError } = await supabase
                .from('schools')
                .insert([{
                    name: state.school.name,
                    domain_prefix: state.domain,
                    neis_code: state.school.schoolCode,
                    atpt_code: state.school.atptCode,
                    settings: {
                        default_auth_mode: state.authMode,
                        login_session_mode: loginMode,
                        student_id_length: parseInt(studentIdLength),
                        teacher_account_type: accountType,
                        admin_info: {
                            name: adminName,
                            dept: adminDept,
                            email: adminEmail,
                            phone: adminPhone
                        },
                        branding: { primary_color: '#6366f1' },
                        philosophy: '1Class - All teachers for all students'
                    }
                }])
                .select()
                .single();

            if (schoolError) throw schoolError;

            await supabase.from('preset_categories').insert([
                { school_id: newSchool.id, name: '인성/예절', icon: 'bi-heart' },
                { school_id: newSchool.id, name: '학습/활동', icon: 'bi-book' },
                { school_id: newSchool.id, name: '출결/생활', icon: 'bi-calendar-check' }
            ]);

            spinner.classList.add('hidden');
            text.innerText = '구축 완료!';
            
            const card = document.querySelector('.onboarding-card');
            card.innerHTML = `
                <div class="text-center py-5 animate__animated animate__zoomIn">
                    <i class="bi bi-check-circle-fill text-success" style="font-size: 5rem;"></i>
                    <h2 class="fw-bold mt-4">${newSchool.name} 개설 완료!</h2>
                    <p class="text-muted">이제 아래 주소로 접속하실 수 있습니다.</p>
                    <div class="alert alert-primary py-3 fw-bold mb-4">
                        https://${newSchool.domain_prefix}.1class.app
                    </div>
                    <button onclick="location.href='index.html'" class="btn btn-primary-gradient w-100">대시보드로 이동</button>
                </div>
            `;
        } catch (error) {
            console.error('Setup Error:', error);
            alert('설정 중 오류가 발생했습니다: ' + error.message);
            spinner.classList.add('hidden');
            text.innerText = '다시 시도';
            setupBtn.disabled = false;
        }
    });
}
