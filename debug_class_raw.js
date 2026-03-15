const NEIS_API_KEY = '31ca8d4d17274275b155ae2e5cabba40';
const BASE_URL = 'https://open.neis.go.kr/hub';

async function debugClassRaw() {
    const atpCode = 'C10'; // 부산
    const schoolCode = '7150429'; // 경성전자고
    const year = '2026';
    
    const url = `${BASE_URL}/classInfo?KEY=${NEIS_API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${atpCode}&SD_SCHUL_CODE=${schoolCode}&AY=${year}`;
    
    console.log('Fetching:', url);
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('--- RAW CLASS RESPONSE ---');
    console.log(JSON.stringify(data, null, 2));
}

debugClassRaw();
