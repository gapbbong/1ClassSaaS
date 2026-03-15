/**
 * 이미지 프로세싱 유틸리티 (Canvas API 기반 리사이징)
 */

export class ImageProcessor {
    /**
     * 이미지를 지정된 크기로 리사이징하고 압축합니다.
     * @param {File} file - 원본 이미지 파일
     * @param {number} maxWidth - 최대 가로 크기
     * @param {number} maxHeight - 최대 세로 크기
     * @returns {Promise<Blob>} 리사이징된 이미지 Blob
     */
    static async resize(file, maxWidth = 400, maxHeight = 500) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // 비율 유지하며 리사이징
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // JPEG로 압축 (품질 0.8)
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.8);
                };
            };
            reader.onerror = error => reject(error);
        });
    }

    /**
     * 파일명에서 지능적으로 학번을 추출합니다.
     * @param {string} filename 
     * @param {number} expectedLength - 기대하는 학번 자릿수 (4 또는 5)
     * @returns {string} 추출된 학번 또는 원본 파일명
     */
    static extractKey(filename, expectedLength = 4) {
        const nameWithoutExt = filename.split('.')[0];
        // 설정된 자릿수에 맞게 정규표현식 동적 생성 (예: \d{4} 또는 \d{5})
        const regex = new RegExp(`\\d{${expectedLength}}`);
        const match = nameWithoutExt.match(regex);
        return match ? match[0] : nameWithoutExt.trim();
    }
}
