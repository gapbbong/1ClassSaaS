import fetch from 'node-fetch';

async function getLiveSettingsFromOtherURL() {
    try {
        const url = `https://script.google.com/macros/s/AKfycbx_pOfD0KfapjIZVf8G-rvTi9BPYK_A_euMrOQCow_YGgA_Q/exec?action=getSettings`;
        console.log("Trying alternative URL:", url);
        const response = await fetch(url);
        const text = await response.text();
        console.log("Response text start:", text.substring(0, 500));
        try {
            const json = JSON.parse(text);
            console.log("Good:", json.good?.length);
            console.log("Bad:", json.bad?.length);
            console.log("Good list:", json.good);
            console.log("Bad list:", json.bad);
        } catch (e) {
            console.log("Not JSON");
        }
    } catch (err) {
        console.error(err);
    }
}

getLiveSettingsFromOtherURL();
