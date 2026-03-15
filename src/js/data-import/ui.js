/**
 * 프리미엄 UI 알림(Toast) 유틸리티
 */
export class UI {
    static toast(message, type = 'info', title = '알림') {
        const toastEl = document.getElementById('liveToast');
        if (!toastEl) return;

        const iconEl = document.getElementById('toast-icon');
        const iconBg = document.getElementById('toast-icon-bg');
        const titleEl = document.getElementById('toast-title');
        const messageEl = document.getElementById('toast-message');

        // 타입별 스타일 설정
        const styles = {
            success: { bg: 'bg-success', icon: 'bi-check-circle-fill', label: '성공' },
            error: { bg: 'bg-danger', icon: 'bi-exclamation-triangle-fill', label: '오류' },
            warning: { bg: 'bg-warning', icon: 'bi-exclamation-circle-fill', label: '주의' },
            info: { bg: 'bg-primary', icon: 'bi-info-circle-fill', label: '안내' }
        };

        const style = styles[type] || styles.info;

        iconBg.className = `px-3 d-flex align-items-center text-white ${style.bg}`;
        iconEl.className = `bi ${style.icon}`;
        titleEl.innerText = title === '알림' ? style.label : title;
        messageEl.innerText = message;

        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    }

    static showLoading(elementId, text = '처리 중...') {
        const el = document.getElementById(elementId);
        if (el) {
            el.innerHTML = `<div class="loading-spinner d-inline-block me-2" style="width:1rem; height:1rem; border-width:2px;"></div> ${text}`;
            el.disabled = true;
        }
    }

    static hideLoading(elementId, originalText) {
        const el = document.getElementById(elementId);
        if (el) {
            el.innerHTML = originalText;
            el.disabled = false;
        }
    }
}
