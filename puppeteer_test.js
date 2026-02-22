import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    page.on('pageerror', error => {
        console.log(`[Browser Error]: ${error.message}`);
    });

    page.on('requestfailed', request => {
        console.log(`[Network Error]: ${request.url()} - ${request.failure().errorText}`);
    });

    try {
        await page.goto('http://localhost:5174', { waitUntil: 'networkidle0', timeout: 5000 });
    } catch (e) {
        console.log(`[Navigation Error]: ${e.message}`);
    }

    await browser.close();
})();
