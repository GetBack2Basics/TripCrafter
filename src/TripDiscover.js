import React from 'react';
import { BedDouble, Tent, Car, Info, Ship, Pen, Trash2 } from 'lucide-react';

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
function clientSourceImages(location) {
  const q = encodeURIComponent((location || 'travel').split(',')[0]);
  return [1, 2, 3].map(i => `https://source.unsplash.com/800x600/?${q}&sig=${i}`);
}

// Try to fetch images from the serverless proxy. The component will use
// clientSourceImages as a fast fallback so the UI remains snappy.
async function fetchDiscoverImages(location) {
  try {
    const q = encodeURIComponent((location || 'travel').split(',')[0]);
    const resp = await fetch(`/api/unsplash-proxy?q=${q}`);
    if (!resp.ok) throw new Error('proxy fetch failed');
    const json = await resp.json();
    if (json && Array.isArray(json.images) && json.images.length) return json.images;
  } catch (err) {
    // ignore and let the caller fallback
  }
  return clientSourceImages(location);
}

export default function TripDiscover({ tripItems = [], handleEditClick, handleDeleteItem }) {
  const sorted = Array.isArray(tripItems) ? tripItems.slice().sort((a, b) => (a?.date || '').localeCompare(b?.date || '')) : [];
  const [imageCache, setImageCache] = React.useState(() => ({}));

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
          const imgs = await fetchDiscoverImages(item.location);
          if (!mounted) return;
          setImageCache(prev => ({ ...prev, [item.id]: imgs }));
        } catch (e) {
          // ignore per-location errors
        }
      }
    })();
    return () => { mounted = false; };
  }, [tripItems]);
  if (!sorted.length) {
    return <p className="text-center text-gray-400 text-lg py-8">No discover items available.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {sorted.map((item) => {
        const cached = imageCache[item.id];
        const images = cached || clientSourceImages(item.location);
        const imgUrl = images[0] || '/logo512.png';
        return (
          <div key={item.id} className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col hover:shadow-2xl transition-shadow duration-200">
            <div className="overflow-hidden rounded-t-xl">
              <img
                src={imgUrl}
                alt={item.location}
                className="h-40 w-full object-cover border-b border-gray-200 transition-transform duration-200 hover:scale-105"
                style={{ background: '#f8fafc' }}
              />
            </div>
            <div className="p-3 flex-1 flex flex-col">
              <div className="font-bold text-indigo-700 text-sm mb-1 flex items-center gap-2">
                {getTypeIcon(item.type, item)}
                {item.location}
              </div>
              <div className="text-xs text-gray-500 flex-1">{item.title || item.activities || ''}</div>
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
