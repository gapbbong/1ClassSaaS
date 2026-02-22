import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER_ERROR:', err.message));

        await page.goto('http://localhost:5173');
        await new Promise(r => setTimeout(r, 2000));
        await browser.close();
    } catch (e) {
        console.error(e);
    }
})();
