/**
 * 프리미엄 UI 알림(Toast) 유틸리티 (전역 공유)
 */
export class UI {
    static toast(message, type = 'info', title = '알림') {
        const toastEl = document.getElementById('liveToast');
        if (!toastEl) {
            console.warn('Toast container not found in DOM');
            return;
        }

        const iconEl = document.getElementById('toast-icon');
        const iconBg = document.getElementById('toast-icon-bg');
        const titleEl = document.getElementById('toast-title');
        const messageEl = document.getElementById('toast-message');

        const styles = {
            success: { bg: 'bg-success', icon: 'bi-check-circle-fill', label: '성공' },
            error: { bg: 'bg-danger', icon: 'bi-exclamation-triangle-fill', label: '오류' },
            warning: { bg: 'bg-warning', icon: 'bi-exclamation-circle-fill', label: '주의' },
            info: { bg: 'bg-primary', icon: 'bi-info-circle-fill', label: '안내' }
        };

        const style = styles[type] || styles.info;

        if (iconBg) iconBg.className = `px-3 d-flex align-items-center text-white ${style.bg}`;
        if (iconEl) iconEl.className = `bi ${style.icon}`;
        if (titleEl) titleEl.innerText = title === '알림' ? style.label : title;
        if (messageEl) messageEl.innerText = message;

        // Bootstrap Toast 인스턴스 가져오기 또는 생성
        let toast = bootstrap.Toast.getInstance(toastEl);
        if (!toast) toast = new bootstrap.Toast(toastEl, { delay: 4000 });
        toast.show();
    }

    static showLoading(elementId, text = '처리 중...') {
        const el = document.getElementById(elementId);
        if (el) {
            el.dataset.originalHtml = el.innerHTML;
            el.innerHTML = `<div class="loading-spinner d-inline-block me-2" style="width:1rem; height:1rem; border-width:2px; border-color: inherit; border-top-color: transparent; vertical-align: middle;"></div> ${text}`;
            el.disabled = true;
        }
    }

    static hideLoading(elementId) {
        const el = document.getElementById(elementId);
        if (el && el.dataset.originalHtml) {
            el.innerHTML = el.dataset.originalHtml;
            el.disabled = false;
        }
    }
}
