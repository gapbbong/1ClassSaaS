/**
 * 구글 드라이브 URL에서 파일 ID를 추출합니다.
 * @param {string} url - 구글 드라이브 URL
 * @returns {string|null} 파일 ID 또는 null
 */
export function extractDriveId(url) {
    if (!url) return null;
    const match = url.match(/(?:\/d\/|id=)([\w-]{25,})/);
    return match ? match[1] : null;
}

/**
 * 썸네일 이미지 URL을 생성합니다.
 * @param {string} fileId - 파일 ID
 * @returns {string} 썸네일 URL
 */
export function getThumbnailUrl(fileId) {
    // lh3.googleusercontent.com 은 구글 드라이브 썸네일의 고성능 CDN 도메인입니다.
    // =s220 은 가로 220px 크기를 의미합니다.
    return fileId
        ? `https://lh3.googleusercontent.com/d/${fileId}=s220`
        : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
}

/**
 * 날짜를 포맷팅합니다.
 * @param {string} isoStr - ISO 날짜 문자열
 * @returns {string} 포맷팅된 날짜 문자열
 */
export function formatDate(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return isNaN(d)
        ? isoStr
        : `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 배경색이 밝은지 확인합니다.
 * @param {string} hex - HEX 색상 코드
 * @returns {boolean} 밝으면 true
 */
export function isLightColor(hex) {
    const c = hex.substring(1);
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 160;
}
