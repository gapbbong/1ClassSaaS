import { API_CONFIG } from './config.js';

/**
 * 학생 기록을 조회합니다.
 * @param {string} num - 학번
 * @returns {Promise<Array>} 기록 목록
 */
export async function fetchStudentRecords(num, name) {
    if (!num) return [];
    try {
        // 서버 액션명을 getStudentRecords로 변경 (원본 코드로 추정) or getRecords
        // 실패 원인이 getRecords였으므로 getStudentRecords 시도
        let url = `${API_CONFIG.SCRIPT_URL}?action=getStudentRecords&num=${encodeURIComponent(num)}`;

        // 이름이 있으면 파라미터 추가
        if (name) {
            url += `&name=${encodeURIComponent(name)}`;
        }

        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error("Fetch Error:", error);
        throw new Error("기록을 불러오지 못했습니다.");
    }
}

/**
 * 학생 정보를 검색합니다.
 * @returns {Promise<Array>} 학생 목록
 */
export async function fetchAllStudents() {
    try {
        const response = await fetch(API_CONFIG.SEARCH_URL);
        return await response.json();
    } catch (error) {
        console.error("Fetch Error:", error);
        throw new Error("학생 데이터를 불러오지 못했습니다.");
    }
}

/**
 * 새로운 기록을 저장합니다.
 * @param {FormData} formData - 기록 데이터
 * @returns {Promise<Object>} 결과 객체
 */
export async function saveRecord(formData) {
    try {
        const response = await fetch(API_CONFIG.SCRIPT_URL, {
            method: "POST",
            body: formData
        });
        return await response.json();
    } catch (error) {
        console.error("Post Error:", error);
        throw new Error("저장에 실패했습니다.");
    }
}

/**
 * 기록을 삭제합니다.
 * @param {string} num - 학번
 * @param {string} time - 기록 시간
 * @returns {Promise<Object>} 결과 객체
 */
export async function deleteRecord(num, time) {
    const formData = new FormData();
    formData.append("action", "delete");
    formData.append("num", num);
    formData.append("time", time);

    try {
        const response = await fetch(API_CONFIG.SCRIPT_URL, {
            method: "POST",
            body: formData
        });
        return await response.json();
    } catch (error) {
        console.error("Delete Error:", error);
        throw new Error("삭제에 실패했습니다.");
    }
}

/**
 * 학급별 또는 전체 기록을 조회합니다.
 * @param {string|number} grade - 학년 (선택)
 * @param {string|number} classNum - 반 (선택)
 * @returns {Promise<Array>} 기록 목록
 */
export async function fetchGroupRecords(grade, classNum) {
    try {
        let url = `${API_CONFIG.SCRIPT_URL}?action=getGroupRecords`;
        if (grade) url += `&grade=${encodeURIComponent(grade)}`;
        if (classNum) url += `&class=${encodeURIComponent(classNum)}`;

        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error("Fetch Group Records Error:", error);
        throw new Error("그룹 기록을 불러오지 못했습니다.");
    }
}

