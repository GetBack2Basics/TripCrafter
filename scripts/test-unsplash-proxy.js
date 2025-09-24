/* Quick test runner for api/unsplash-proxy.js
   Usage: node scripts/test-unsplash-proxy.js [query]
   Reads UNSPLASH_ACCESS_KEY from environment if present.
*/

const path = require('path');

async function run() {
  const q = process.argv[2] || 'tasmania';
  const modPath = path.resolve(__dirname, '..', 'api', 'unsplash-proxy.js');
  // require the module as a function
  const handler = require(modPath);

  const req = { query: { q } };
  const res = {
    status(code) { this._status = code; return this; },
    json(obj) { console.log('STATUS', this._status || 200); console.log(JSON.stringify(obj, null, 2)); }
  };

  try {
    await handler(req, res);
  } catch (err) {
    console.error('Error running proxy:', err && err.message);
    process.exit(1);
  }
}

run();
