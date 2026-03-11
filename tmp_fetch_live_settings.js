import fetch from 'node-fetch';
import { API_CONFIG } from './src/js/config.js';

async function getLiveSettings() {
    try {
        console.log("📡 Fetching live settings from Google Sheets...");
        console.log("URL:", `${API_CONFIG.SCRIPT_URL}?action=getSettings`);
        
        const response = await fetch(`${API_CONFIG.SCRIPT_URL}?action=getSettings`);
        if (!response.ok) throw new Error("Fetch failed");
        
        const settings = await response.json();
        console.log("✅ Settings received:");
        console.log(JSON.stringify(settings, null, 2));
    } catch (err) {
        console.error("❌ Error fetching settings:", err.message);
    }
}

getLiveSettings();
