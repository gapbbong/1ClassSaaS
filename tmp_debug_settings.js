import fetch from 'node-fetch';
import { API_CONFIG } from './src/js/config.js';

async function getLiveSettings() {
    try {
        const url = `${API_CONFIG.SCRIPT_URL}?action=getSettings`;
        const response = await fetch(url);
        const text = await response.text();
        console.log("Response text start:", text.substring(0, 500));
        try {
            const json = JSON.parse(text);
            console.log("Good:", json.good?.length);
            console.log("Bad:", json.bad?.length);
            console.log("First 3 Good:", json.good?.slice(0, 3));
            console.log("First 3 Bad:", json.bad?.slice(0, 3));
        } catch (e) {
            console.log("Not JSON");
        }
    } catch (err) {
        console.error(err);
    }
}

getLiveSettings();
