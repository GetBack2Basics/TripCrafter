import React from 'react';
import { BedDouble, Tent, Car, Info, Ship, Pen, Trash2 } from 'lucide-react';

// Runtime-controllable debug UI. Default: hidden. Toggle in header or via
// window.__TRIP_DISCOVER_DEBUG or localStorage key 'TRIP_DISCOVER_DEBUG'.

function getTypeIcon(type, item) {
  if (type === 'roofed') return <BedDouble className="inline w-5 h-5 text-indigo-400" title="Title" />;
  if (type === 'camp') return <Tent className="inline w-5 h-5 text-green-500" title="Camping" />;
  if (type === 'enroute') return <Car className="inline w-5 h-5 text-orange-400" title="Enroute" />;
  if (type === 'note') return <Info className="inline w-5 h-5 text-gray-400" title="Note" />;
  if (type === 'ferry' || (item && item.title?.toLowerCase().includes('spirit'))) return <Ship className="inline w-5 h-5 text-blue-400" title="Ferry" />;
  if (type === 'car') return <Car className="inline w-5 h-5 text-gray-500" title="Car" />;
  return null;
}


// Use the same slug logic as TripDashboard.js
function locationSlug(location) {
  if (!location) return 'default';
  return location
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/,/g, '__')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

// Default client-side image generator (no API key required)
function clientSourceImages(location, profile = {}) {
  const base = (location || 'travel').split(',')[0] || '';
  const extras = [profile.state, profile.country].filter(Boolean).join(' ');
  const q = encodeURIComponent(`${base} ${extras}`.trim());
  return [1, 2, 3].map(i => `https://source.unsplash.com/800x600/?${q}&sig=${i}`);
}

// Try to fetch images from the serverless proxy. The component will use
// clientSourceImages as a fast fallback so the UI remains snappy.
async function fetchDiscoverImages(location, profile = {}) {
  try {
    // send full location string and profile state/country to the proxy so it can disambiguate
    const q = encodeURIComponent(location || 'travel');
    const state = encodeURIComponent(profile.state || '');
    const country = encodeURIComponent(profile.country || '');
    // Add a timestamp to avoid intermediate caching of the function response in browsers/CDN
  const url = `/.netlify/functions/unsplash-proxy?q=${q}${state ? `&state=${state}` : ''}${country ? `&country=${country}` : ''}&_ts=${Date.now()}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('proxy fetch failed');
    const json = await resp.json();
    if (json && Array.isArray(json.images) && json.images.length) {
      // If proxy returned a fallback (source.unsplash.com) try one retry with an augmented query
      if (json.source === 'source.unsplash.com' && (profile.state || profile.country)) {
        try {
          const loc = (location || '').toString();
          const hasState = profile.state && loc.toLowerCase().includes(String(profile.state).toLowerCase());
          const hasCountry = profile.country && loc.toLowerCase().includes(String(profile.country).toLowerCase());
          if (!hasState || !hasCountry) {
            const augmented = `${loc} ${profile.state || ''} ${profile.country || ''}`.trim();
            const q2 = encodeURIComponent(augmented || 'travel');
            const url2 = `/.netlify/functions/unsplash-proxy?q=${q2}&_ts=${Date.now()}`;
            try {
              const resp2 = await fetch(url2);
              if (resp2.ok) {
                const json2 = await resp2.json();
                if (json2 && Array.isArray(json2.images) && json2.images.length) {
                  try { console.debug('fetchDiscoverImages retry succeeded', { location, profile, augmented, query: json2.query, source: json2.source, requestedUrl: url2 }); } catch (e) {}
                  return { images: json2.images, source: json2.source || 'unsplash-api', query: json2.query, requestedUrl: url2 };
                }
              }
            } catch (e) {
              try { console.debug('fetchDiscoverImages retry error', { location, profile, err: e && e.message }); } catch (er) {}
            }
          }
        } catch (e) {
          /* ignore retry construction errors */
        }
      }
      return { images: json.images, source: json.source || 'unsplash-api', query: json.query, requestedUrl: url };
    }
  } catch (err) {
    // log error for debugging and let the caller fallback
    try { console.debug('fetchDiscoverImages error', { location, profile, err: err && err.message }); } catch (e) {}
  }
  return { images: clientSourceImages(location, profile), source: 'source.unsplash.com', requestedUrl: null };
}

export default function TripDiscover({ tripItems = [], tripProfile = {}, handleEditClick, handleDeleteItem }) {
  const sorted = Array.isArray(tripItems) ? tripItems.slice().sort((a, b) => (a?.date || '').localeCompare(b?.date || '')) : [];
  const [imageCache, setImageCache] = React.useState(() => ({}));
  const [showDebug, setShowDebug] = React.useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const ls = window.localStorage && window.localStorage.getItem('TRIP_DISCOVER_DEBUG');
        if (ls === 'true') return true;
        if (window.__TRIP_DISCOVER_DEBUG === true) return true;
      }
    } catch (e) {}
    return false;
  });

  // Listen for runtime toggle events from AppHeader or console
  React.useEffect(() => {
    function onToggle(e) {
      try {
        const val = e && e.detail === true;
        setShowDebug(val);
      } catch (err) {}
    }
    try {
      window.addEventListener && window.addEventListener('trip-discover-debug-change', onToggle);
    } catch (e) {}
    return () => { try { window.removeEventListener && window.removeEventListener('trip-discover-debug-change', onToggle); } catch (e) {} };
  }, []);

  // Debug: log props to the console so we can diagnose why nothing renders
  React.useEffect(() => {
    try {
      console.debug('TripDiscover mounted/updated:', { count: Array.isArray(tripItems) ? tripItems.length : 0, sample: (tripItems || [])[0] });
    } catch (e) {}
  }, [tripItems]);

  // Fetch server-side images in background and populate imageCache when available
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!Array.isArray(tripItems) || tripItems.length === 0) return;
      for (const item of tripItems) {
        try {
          // Merge tripProfile into item.profile so global state/country are always included
          const mergedProfile = { ...(tripProfile || {}), ...(item.profile || {}) };
          const result = await fetchDiscoverImages(item.location, mergedProfile);
          if (!mounted) return;
          // store images + source metadata
          // keep a copy of the original location/title used for the request so
          // the UI can show the exact card title as the query (user request)
          setImageCache(prev => ({ ...prev, [item.id]: { images: result.images || result, source: result.source || 'source.unsplash.com', query: result.query, originalQuery: item.location || '', requestedUrl: result.requestedUrl } }));
          try { console.debug('TripDiscover image update', { id: item.id, source: result.source || 'source.unsplash.com', first: (result.images || result)[0], query: result.query }); } catch (e) {}
        } catch (e) {
          // ignore per-location errors
        }
      }
    })();
    return () => { mounted = false; };
  }, [tripItems, tripProfile]);
  if (!sorted.length) {
    return <p className="text-center text-gray-400 text-lg py-8">No discover items available.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {sorted.map((item) => {
        const cached = imageCache[item.id];
  // Don't show the client-side source.unsplash.com fallback immediately.
  // Use a neutral placeholder until the server proxy responds and fills the cache.
  // Compute merged profile for display fallback generation too
  const mergedProfile = { ...(tripProfile || {}), ...(item.profile || {}) };
  const images = (cached && cached.images) || null;
  const srcBadge = (cached && cached.source) || 'Loading';
  const imgUrl = (images && images[0]) || '/logo512.png';
        return (
          <div key={item.id} className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col hover:shadow-2xl transition-shadow duration-200">
            <div className="overflow-hidden rounded-t-xl">
              <div className="relative">
                <img
                  src={imgUrl}
                  alt={item.location}
                  className="h-40 w-full object-cover border-b border-gray-200 transition-transform duration-200 hover:scale-105"
                  style={{ background: '#f8fafc' }}
                />
                <div title={cached && cached.query ? `search: ${cached.query}` : ''} className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">{srcBadge === 'unsplash-api' ? 'Unsplash' : 'Fallback'}</div>
              </div>
            </div>
            <div className="p-3 flex-1 flex flex-col">
              <div className="font-bold text-indigo-700 text-sm mb-1 flex items-center gap-2">
                {getTypeIcon(item.type, item)}
                {item.location}
              </div>
              <div className="text-xs text-gray-500 flex-1">{item.title || item.activities || ''}</div>
              {/* Debug info (hidden by default). Toggle at runtime via header button or window.__TRIP_DISCOVER_DEBUG/localStorage */}
              {showDebug ? (
                <div className="text-xs text-gray-400 mt-2">
                  <div>Source: <span className="font-medium text-gray-700">{srcBadge}</span></div>
                  <div>Query: <span className="font-medium text-gray-700">{(cached && (cached.originalQuery || cached.query)) || ''}</span></div>
                  <div className="truncate">Image: <span className="font-medium text-gray-700">{imgUrl}</span></div>
                  <div className="truncate">Requested: <span className="font-medium text-gray-700">{(cached && cached.requestedUrl) || ''}</span></div>
                </div>
              ) : null}

              <div className="flex gap-2 mt-2">
                <button
                  className="h-10 min-h-[2.5rem] px-4 flex items-center justify-center rounded-lg font-semibold text-sm shadow transition bg-blue-600 hover:bg-blue-700 text-white"
                  style={{ fontFamily: 'inherit', lineHeight: 1.2 }}
                  onClick={() => handleEditClick && handleEditClick(item)}
                  title="Edit"
                >
                  <Pen className="w-4 h-4 mr-2" />Edit
                </button>
                <button
                  className="h-10 min-h-[2.5rem] px-4 flex items-center justify-center rounded-lg font-semibold text-sm shadow transition bg-red-100 hover:bg-red-200 text-red-600"
                  style={{ fontFamily: 'inherit', lineHeight: 1.2 }}
                  onClick={() => handleDeleteItem && handleDeleteItem(item.id)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 mr-2" />Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Kick off background fetches for images so they replace client-side
// source images when available. We do this after export to avoid hooks
// inside loops and keep the component pure; callers render immediately and
// images update in-place when the fetch completes.
(function prefetchAllDiscoverImages() {
  // Only run in browser environments
  if (typeof window === 'undefined') return;
  // Observe DOM for TripDiscover items and trigger cache fills
  try {
    // Find trip items from a global-ish place: read from window.__TRIP_DISCOVER_ITEMS if set
    const items = window.__TRIP_DISCOVER_ITEMS || null;
    if (!Array.isArray(items)) return;
    items.forEach(async (item) => {
      if (!item || !item.id) return;
      // Request proxy; fetchDiscoverImages returns client fallback if proxy isn't available
      const imgs = await fetchDiscoverImages(item.location);
      // Store on item so React can pick it up if the component mutates imageCache externally
      item._discoverImages = imgs;
    });
  } catch (err) {
    // noop
  }
})();
