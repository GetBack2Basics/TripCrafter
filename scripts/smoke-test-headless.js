const puppeteer = require('puppeteer');

(async () => {
  const url = 'http://localhost:5005';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console.error', text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    errors.push({ type: 'pageerror', text: String(err) });
  });

  try {
    console.log('Opening', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // wait a short time for any lazy scripts to run
    await page.waitForTimeout(1200);
  } catch (e) {
    errors.push({ type: 'navigation', text: String(e) });
  }

  if (errors.length === 0) {
    console.log('SMOKE TEST: no console errors captured');
    await browser.close();
    process.exit(0);
  } else {
    console.error('SMOKE TEST: errors captured:');
    for (const err of errors) console.error(err.type, err.text);
    await browser.close();
    process.exit(2);
  }
})();
