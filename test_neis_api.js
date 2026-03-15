import { searchSchool, getClassInfo } from './src/js/neis-api.js';

async function testNeis() {
    console.log('🔍 나이스 API 테스트 시작 (대상: 경성전자고)');
    
    // 1. 학교 검색
    const school = await searchSchool('경성전자고');
    if (school) {
        console.log('✅ 학교 정보 획득:', school);
        
        // 2. 학급 정보 조회 (2026학년도)
        const classes = await getClassInfo(school.atptCode, school.schoolCode, 2026);
        console.log(`✅ ${classes.length}개 학급 정보 조회 완료:`);
        
        // 학년별로 요약 표시
        const summary = classes.reduce((acc, curr) => {
            acc[curr.grade] = (acc[curr.grade] || 0) + 1;
            return acc;
        }, {});
        console.log('📊 학급 구성 요약:', summary);
    } else {
        console.log('❌ 학교를 찾을 수 없습니다.');
    }
}

// Node 환경에서 fetch가 없을 경우를 대비해 권장되지만, 
// 현재 환경은 브라우저 기반 프로젝트이므로 실행 방식에 주의가 필요합니다.
// 이 코드는 테스트용 로직 구조를 보여줍니다.
testNeis();
