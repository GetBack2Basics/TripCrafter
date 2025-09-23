const puppeteer = require('puppeteer');
(async () => {
  const url = process.argv[2] || 'http://localhost:3002';
  console.log('Opening', url);
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => {
    try {
      const args = msg.args().map(a => a._remoteObject ? (a._remoteObject.description || a._remoteObject.value) : String(a));
      console.log('BROWSER LOG:', msg.type(), args.join(' '));
    } catch (e) { console.log('BROWSER LOG ERR', e); }
  });
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err && err.stack ? err.stack : String(err)));
  page.on('response', resp => {
    const status = resp.status();
    const urlR = resp.url();
    // Print errors or CORS failures
    if (status >= 400) console.log('BROWSER RESPONSE ERROR:', status, urlR);
  });
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
  } catch (e) {
    console.log('Page goto failed:', e && e.message ? e.message : String(e));
  }
  console.log('Listening for console logs for 12s...');
  await new Promise(r => setTimeout(r, 12000));
  await browser.close();
  console.log('Done capturing logs');
})();