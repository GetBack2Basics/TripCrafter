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

// Netlify functions expect an exported `handler` with signature (event, context)
// We'll adapt the same logic but read from event.queryStringParameters and
// return a standard { statusCode, headers, body } response.
exports.handler = async function handler(event, context) {
  try {
    const qs = event && event.queryStringParameters ? event.queryStringParameters : {};
    // Accept q + optional state/country to disambiguate locations (e.g., Newcastle NSW Australia)
    const rawQ = (qs.q || qs.query || 'travel');
    const rawState = qs.state || qs.s || '';
    const rawCountry = qs.country || qs.c || '';

    // Sanitize and normalize a search query: prefer first two comma-separated parts (city, state),
    // append state and country if provided, remove postal codes and punctuation, collapse whitespace.
    const sanitizeQuery = (qstr, stateStr, countryStr) => {
      try {
        let parts = [];
        if (typeof qstr === 'string' && qstr.trim()) {
          const tokens = qstr.split(',').map(s => s.trim()).filter(Boolean);
          // keep at most first two parts from the location string (city [, state])
          const head = tokens.slice(0, 2).join(' ');
          if (head) parts.push(head);
        }
        if (stateStr && String(stateStr).trim()) parts.push(String(stateStr).trim());
        if (countryStr && String(countryStr).trim()) parts.push(String(countryStr).trim());

        let combined = parts.join(' ').trim() || 'travel';
        // remove common postcode sequences (3-6 digits)
        combined = combined.replace(/\b\d{3,6}\b/g, '');
        // replace any non-word (letters/numbers/underscore) and non-space characters with a space
        combined = combined.replace(/[^\w\s]/g, ' ');
        // collapse multiple spaces
        combined = combined.replace(/\s+/g, ' ').trim();
        // limit length to avoid overly long queries
        if (combined.length > 100) combined = combined.slice(0, 100).trim();
        return combined || 'travel';
      } catch (e) {
        return (qstr || 'travel').split(',')[0] || 'travel';
      }
    };

  let q = sanitizeQuery(rawQ, rawState, rawCountry);
    const perPage = 3;

    const accessKey = process.env.UNSPLASH_ACCESS_KEY || process.env.REACT_APP_UNSPLASH_ACCESS_KEY;

    const jsonResponse = (obj, status = 200) => ({
      statusCode: status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj),
    });

    if (!accessKey) {
      // No key: return source.unsplash.com dynamic images (public, no key needed)
      const images = [1, 2, 3].map(i => `https://source.unsplash.com/800x600/?${encodeURIComponent(q)}&sig=${i}`);
      return jsonResponse({ source: 'source.unsplash.com', images, query: q });
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
      return jsonResponse({ source: 'source.unsplash.com', images, warning: 'unsplash api call failed', query: q });
    }

    const data = await resp.json();
    const images = (data.results || []).slice(0, perPage).map(r => r.urls && (r.urls.regular || r.urls.small)).filter(Boolean);

    if (!images.length) {
      const fallback = [1, 2, 3].map(i => `https://source.unsplash.com/800x600/?${encodeURIComponent(q)}&sig=${i}`);
      return jsonResponse({ source: 'source.unsplash.com', images: fallback, warning: 'no results', query: q });
    }

    return jsonResponse({ source: 'unsplash-api', images, query: q });
  } catch (err) {
    console.error('unsplash-proxy error', err && err.message);
    const qs = event && event.queryStringParameters ? event.queryStringParameters : {};
    const fallbackQ = (qs.q || 'travel').split(',')[0] || 'travel';
    const images = [1, 2, 3].map(i => `https://source.unsplash.com/800x600/?${encodeURIComponent(fallbackQ)}&sig=${i}`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'source.unsplash.com', images, error: err && err.message, query: fallbackQ }),
    };
  }
};
