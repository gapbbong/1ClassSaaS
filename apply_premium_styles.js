import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cssPath = path.join(__dirname, 'src', 'css', 'stu-list.css');

const cssToAdd = `
/* Student Action Modal Styles */
.action-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 16px;
    border-radius: 14px;
    border: 1px solid rgba(0,0,0,0.06);
    background: #ffffff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    font-size: 1.05em;
    font-weight: 600;
    color: #333;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.08);
    border-color: rgba(0,122,255,0.3);
    background: #f8faff;
}

.action-btn:active {
    transform: scale(0.97);
}

.action-icon {
    font-size: 1.3em;
}

/* Action inputs for taking attendance/status change */
.action-input-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 15px;
    padding: 18px;
    background: #f8f9fa;
    border-radius: 14px;
    border: 1px solid rgba(0,0,0,0.05);
}

.action-input-group label {
    font-size: 0.9em;
    font-weight: 600;
    color: #555;
    text-align: left;
}

.action-input-group select,
.action-input-group input[type="time"] {
    width: 100%;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid #ddd;
    font-size: 1em;
    font-family: inherit;
    background: #fff;
    transition: border-color 0.2s;
}

.action-input-group select:focus,
.action-input-group input[type="time"]:focus {
    outline: none;
    border-color: #007aff;
}

.action-submit-btn {
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    border: none;
    background: #007aff;
    color: white;
    font-weight: 600;
    font-size: 1.05em;
    cursor: pointer;
    margin-top: 8px;
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
    transition: all 0.2s ease;
}

.action-submit-btn:hover {
    background: #0066cc;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4);
}

.action-submit-btn:active {
    transform: scale(0.98);
}
`;

fs.appendFileSync(cssPath, cssToAdd, 'utf8');
console.log('Premium styles successfully appended to stu-list.css');
