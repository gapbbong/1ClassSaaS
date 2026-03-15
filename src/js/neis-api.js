/**
 * [1Class] 나이스(NEIS) 오픈 API 연동 유틸리티
 */

const NEIS_API_KEY = '31ca8d4d17274275b155ae2e5cabba40';
const BASE_URL = 'https://open.neis.go.kr/hub';

/**
 * 나이스 API를 이용해 학교를 검색합니다.
 * @param {string} schoolName - 학교명 (예: '경성전자')
 * @param {string} atptCode - 시도교육청코드 (선택)
 */
export async function searchSchool(schoolName, atptCode = '') {
    try {
        let url = `${BASE_URL}/schoolInfo?KEY=${NEIS_API_KEY}&Type=json&pIndex=1&pSize=20&SCHUL_NM=${encodeURIComponent(schoolName)}`;
        if (atptCode) {
            url += `&ATPT_OFCDC_SC_CODE=${atptCode}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.schoolInfo) {
            const list = data.schoolInfo[1].row;
            return list.map(item => ({
                atptCode: item.ATPT_OFCDC_SC_CODE, // 시도교육청코드
                schoolCode: item.SD_SCHUL_CODE,     // 표준학교코드
                name: item.SCHUL_NM,               // 학교명
                address: item.ORG_RDNMA,           // 도로명주소
                homepage: item.HMPG_ADRES,         // 홈페이지
                region: item.ATPT_OFCDC_SC_NM,     // 지역명
                type: item.SCHUL_KND_SC_NM         // 학교급 (초/중/고)
            }));
        }
        return [];
    } catch (error) {
        console.error('NEIS School Search Error:', error);
        return [];
    }
}

/**
 * 특정 학교의 학급 정보(학년/반)를 가져옵니다.
 * @param {string} atptCode - 교육청코드
 * @param {string} schoolCode - 학교코드
 * @param {number} year - 학년도 (예: 2026)
 * @returns {Promise<Array>}
 */
export async function getClassInfo(atptCode, schoolCode, year) {
    try {
        const url = `${BASE_URL}/classInfo?KEY=${NEIS_API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}&AY=${year}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.classInfo) {
            return data.classInfo[1].row.map(row => ({
                grade: row.GRADE,    // 학년
                classNm: row.CLASS_NM // 반
            }));
        }
        return [];
    } catch (error) {
        console.error('NEIS Class Info Error:', error);
        return [];
    }
}

/**
 * 학교 일정을 가져옵니다.
 * @param {string} atptCode 
 * @param {string} schoolCode 
 * @param {string} fromDate - 시작일 (YYYYMMDD)
 * @param {string} toDate - 종료일 (YYYYMMDD)
 */
export async function getSchedule(atptCode, schoolCode, fromDate, toDate) {
    try {
        const url = `${BASE_URL}/SchoolSchedule?KEY=${NEIS_API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}&AA_FROM_YMD=${fromDate}&AA_TO_YMD=${toDate}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.SchoolSchedule) {
            return data.SchoolSchedule[1].row.map(row => ({
                date: row.AA_YMD,      // 날짜
                eventName: row.EVENT_NM // 행사명
            }));
        }
        return [];
    } catch (error) {
        console.error('NEIS Schedule Error:', error);
        return [];
    }
}
