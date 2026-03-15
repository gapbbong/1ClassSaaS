const NEIS_API_KEY = '31ca8d4d17274275b155ae2e5cabba40';
const BASE_URL = 'https://open.neis.go.kr/hub';

async function debugNeis() {
    const schoolName = '경성전자고';
    const url = `${BASE_URL}/schoolInfo?KEY=${NEIS_API_KEY}&Type=json&SCHUL_NM=${encodeURIComponent(schoolName)}`;
    
    console.log('Fetching:', url);
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('--- RAW RESPONE ---');
    console.log(JSON.stringify(data, null, 2));
}

debugNeis();
