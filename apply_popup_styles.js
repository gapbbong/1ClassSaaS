import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cssPath = path.join(__dirname, 'src', 'css', 'stu-list.css');

const popupCss = `
/* Modern Student Detail Popup (2x2 Grid) */
.student-detail-popup {
    background: #ffffff;
    border-radius: 20px;
    padding: 24px;
    width: 90%;
    max-width: 600px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: popupFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes popupFadeIn {
    from { opacity: 0; transform: translate(-50%, -46%) scale(0.96); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

.popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #f0f2f5;
    padding-bottom: 12px;
}

.popup-header h3 {
    margin: 0;
    font-size: 1.4em;
    font-weight: 700;
    color: #1d1d1f;
    display: flex;
    align-items: center;
    gap: 8px;
}

.popup-num {
    background: #e8f0fe;
    color: #1a73e8;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 0.85em;
}

.popup-header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.popup-close-btn {
    background: #f1f3f4;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #5f6368;
    font-size: 1.1em;
    transition: background 0.2s;
}

.popup-close-btn:hover { background: #e8eaed; color: #d93025; }

.popup-record-btn {
    background: white;
    border: 1px solid #d2d2d7;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9em;
    color: #1d1d1f;
    transition: all 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.02);
}
.popup-record-btn:hover { background: #f5f5f7; border-color: #c6c6c8; }

.popup-grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 20px;
    min-height: 250px;
    max-height: 60vh;
}

@media (max-width: 500px) {
    .popup-grid {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
    }
}

.popup-photo-section {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background: #f8f9fa;
    border-radius: 12px;
    padding: 10px;
    overflow: hidden;
}

.popup-photo-section img {
    width: 100%;
    height: auto;
    max-height: 280px;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.no-photo-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 180px;
    color: #a1a1a6;
    font-size: 1em;
    text-align: center;
    background: #f5f5f7;
    border-radius: 12px;
    border: 2px dashed #d2d2d7;
}

.popup-info-section {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 4px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.popup-info-scroll {
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
}

.popup-info-scroll::-webkit-scrollbar { width: 6px; }
.popup-info-scroll::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }

.detail-info-row {
    display: flex;
    flex-direction: column;
    background: white;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.04);
    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}

.detail-label {
    font-size: 0.8em;
    font-weight: 700;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
}

.detail-value {
    font-size: 1.05em;
    font-weight: 500;
    color: #1d1d1f;
    line-height: 1.4;
    word-break: break-word;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.contact-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: #f0f2f5;
    border-radius: 50%;
    text-decoration: none;
    font-size: 1.1em;
    transition: transform 0.2s, background 0.2s;
}

.contact-icon:hover { transform: scale(1.1); background: #e4e6e9; }
.contact-icon[href^="tel:"] { background: #e8f5e9; }
.contact-icon[href^="tel:"]:hover { background: #c8e6c9; }
.contact-icon[href^="sms:"] { background: #e3f2fd; }
.contact-icon[href^="sms:"]:hover { background: #bbdefb; }
.contact-icon.insta-link { background: #fce4ec; }
.contact-icon.insta-link:hover { background: #f8bbd0; }

.popup-footer {
    padding-top: 12px;
}

.popup-confirm-btn {
    width: 100%;
    padding: 14px;
    background: #007aff;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.1em;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.popup-confirm-btn:hover { background: #0066cc; }
.popup-confirm-btn:active { transform: scale(0.98); }
`;

fs.appendFileSync(cssPath, popupCss, 'utf8');
console.log('Appended stylish 2x2 grid popup styles to stu-list.css');
