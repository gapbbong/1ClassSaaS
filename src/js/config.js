export const API_CONFIG = {
    SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzl56WOn26zxiRWpUj_WNNoTK2r_6w5kVp_OHnzd1CrU3XuYiJ2WR02wJDSOFBTptlkmA/exec",
    SECRET_KEY: 'oneclass25-secret-auth-key',
    CURRENT_ACADEMIC_YEAR: 2026
};

// SaaS Supabase Configuration (신규 1ClassSaaS 프로젝트)
export const SUPABASE_CONFIG = {
    URL: "https://zkodhtlikylzwgkzjfpa.supabase.co",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2RodGxpa3lsendna3pqZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTYwMTcsImV4cCI6MjA4OTEzMjAxN30.biWmuaWzne0YBnkwyLr9kOM3EWMAnnLyUh69VlTqeJk"
};

/**
 * 도메인(hostname)을 통해 현재 학교 정보를 식별합니다.
 * @returns {Object} { id, prefix, name }
 */
export function getSchoolContext() {
    const hostname = window.location.hostname;
    
    // 학교 매핑 데이터 (실주소 도메인 반영)
    const schoolMap = {
        'ks.creat1324.com': { prefix: 'ks', name: '경성전자고등학교' },
        'seoul.creat1324.com': { prefix: 'seoul', name: '서울공업고등학교' },
        'localhost': { prefix: 'dev', name: '개발용 테스트 학교' },
        '127.0.0.1': { prefix: 'dev', name: '개발용 테스트 학교' }
    };

    // 서브도메인 추출 ([prefix].creat1324.com)
    const parts = hostname.split('.');
    let prefix = 'dev';
    
    if (hostname.includes('creat1324.com') && parts.length > 2) {
        prefix = parts[0];
    } else if (hostname === 'creat1324.com') {
        prefix = 'main'; // 메인 홈페이지/온보딩
    }

    // 매핑 테이블에서 찾거나 서브도메인을 prefix로 간주
    const school = schoolMap[hostname] || { prefix: prefix, name: prefix === 'main' ? '1Class 메인' : '원클래스 가입 학교' };
    
    return {
        prefix: school.prefix,
        name: school.name,
        // school_id는 세션이나 로컬스토리지에서 가져오며, 없을 경우 API를 통해 prefix로 조회할 수 있습니다.
        id: localStorage.getItem('current_school_id') || null 
    };
}
