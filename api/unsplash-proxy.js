// Simple Unsplash proxy for local / Netlify function usage.
// - If UNSPLASH_ACCESS_KEY is set in the environment, this function
//   will call Unsplash's search API and return an array of image URLs.
// - If no key is present, it falls back to returning source.unsplash.com
//   dynamic URLs so the client can still show images without secrets.
//
// Security note: keep the UNSPLASH_ACCESS_KEY out of source control. Use
// environment variables (Netlify build settings or a local .env file with
// Netlify Dev) when running locally.

// Prefer global fetch (Node 18+ / modern runtimes). Fallback to node-fetch if available.
let fetchFn = (typeof globalThis !== 'undefined' && globalThis.fetch) ? globalThis.fetch : null;
if (!fetchFn) {
  try {
    // node-fetch v3 is ESM; require may work in CommonJS in some setups if installed as v2.
    // Try to require it; if not present, we'll surface an error later when attempting network calls.
    // eslint-disable-next-line global-require
    fetchFn = require('node-fetch');
  } catch (e) {
    fetchFn = null;
  }
}

module.exports = async (req, res) => {
  try {
    const q = (req.query.q || req.query.query || 'travel').split(',')[0];
    const perPage = 3;

    const accessKey = process.env.UNSPLASH_ACCESS_KEY || process.env.REACT_APP_UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
      // No key: return source.unsplash.com dynamic images (public, no key needed)
      const images = [1, 2, 3].map(i => `https://source.unsplash.com/800x600/?${encodeURIComponent(q)}&sig=${i}`);
      return res.json({ source: 'source.unsplash.com', images });
    }

    // Use Unsplash Search API
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${perPage}`;
    if (!fetchFn) throw new Error('fetch is not available in this environment (install node-fetch)');

    const resp = await fetchFn(url, {
      headers: {
        'Accept-Version': 'v1',
        Authorization: `Client-ID ${accessKey}`,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Unsplash search failed', resp.status, text);
      // Fallback to source.unsplash.com if API call fails
      const images = [1, 2, 3].map(i => `https://source.unsplash.com/800x600/?${encodeURIComponent(q)}&sig=${i}`);
      return res.json({ source: 'source.unsplash.com', images, warning: 'unsplash api call failed' });
    }

    const data = await resp.json();
    const images = (data.results || []).slice(0, perPage).map(r => r.urls && (r.urls.regular || r.urls.small)).filter(Boolean);

    if (!images.length) {
      const fallback = [1, 2, 3].map(i => `https://source.unsplash.com/800x600/?${encodeURIComponent(q)}&sig=${i}`);
      return res.json({ source: 'source.unsplash.com', images: fallback, warning: 'no results' });
    }

    return res.json({ source: 'unsplash-api', images });
  } catch (err) {
    console.error('unsplash-proxy error', err && err.message);
    const q = (req.query.q || 'travel').split(',')[0];
    const images = [1, 2, 3].map(i => `https://source.unsplash.com/800x600/?${encodeURIComponent(q)}&sig=${i}`);
    return res.status(200).json({ source: 'source.unsplash.com', images, error: err && err.message });
  }
};
