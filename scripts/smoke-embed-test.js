/* smoke-embed-test.js
 * Lightweight puppeteer smoke test: loads the built openpoimap-lite.html in headless chromium,
 * posts a syncTrip message and a flyToLocation message, and listens for syncAck and flyAck.
 * Exits with code 0 on success, non-zero on failure.
 */

const puppeteer = require('puppeteer');

async function run(){
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const url = 'http://127.0.0.1:8080/openpoimap-lite.html';
  console.log('Loading', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // expose a console listener
  page.on('console', msg => console.log('PAGE:', msg.text()));

  // Wait for map element to exist
  await page.waitForSelector('#map', { timeout: 15000 });

  // Listen for postMessage events coming from the page (via page.evaluate)
  const results = { syncAck: null, flyAck: null };

  await page.exposeFunction('onTestMessage', (ev) => {
    try{
      if(ev && ev.type === 'syncAck') results.syncAck = ev.payload;
      if(ev && ev.type === 'flyAck') results.flyAck = ev.payload;
    }catch(e){ }
  });

  await page.evaluate(() => {
    // set up a test message collector so we can retrieve messages from the page
    window.__TEST_MESSAGES__ = [];
    window.addEventListener('message', (ev)=>{
      try{ window.__TEST_MESSAGES__.push(ev.data); }catch(e){}
    });
  });

  // send a syncTrip message with two simple points (one with a string location to force geocode)
  const trip = { tripId: 'smoke-test-1', items: [ { id: 'a', title: 'Point A', lat: -33.8568, lng: 151.2153 }, { id:'b', title:'Point B', location:'Eiffel Tower, Paris' } ] };

  await page.evaluate((t)=>{
    window.postMessage({ type:'syncTrip', payload: t }, '*');
  }, trip);

  // wait up to 15s for syncAck
  // wait a bit to allow sync processing and geocoding
  await new Promise(r=>setTimeout(r,4000));

  // instead, listen via page.on('console') and messages forwarded to Node via onTestMessage
  // send flyToLocation
  await page.evaluate(()=>{
    window.postMessage({ type:'flyToLocation', payload: { location: 'Sydney Opera House', zoom: 13 } }, '*');
  });

  // wait a short while for flyAck
  await new Promise(r=>setTimeout(r,3000));

  // retrieve collected results by evaluating a small getter
  const messages = await page.evaluate(()=>{ return window.__TEST_MESSAGES__ || []; });
  console.log('Collected messages from page:', messages);

  // Basic assertions
  const hasSync = messages.some(m=>m && m.type === 'syncAck');
  const hasFly = messages.some(m=>m && m.type === 'flyAck');
  if(!hasSync){ console.error('Missing syncAck from embed'); await browser.close(); process.exit(3); }
  if(!hasFly){ console.error('Missing flyAck from embed'); await browser.close(); process.exit(4); }

  await browser.close();
  console.log('Smoke test finished (no explicit acks captured via page->node pipe).');
  return 0;
}

run().catch(err => { console.error(err); process.exit(2); });
