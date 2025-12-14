import React, { useEffect, useState, useCallback, useRef } from 'react';
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, writeBatch } from 'firebase/firestore';
import { BedDouble, Tent, Car, Info, Ship } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// MarkerCluster (imperative integration)
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper to get local discover image path for a location
function getLocalDiscoverImage(location) {
  if (!location) return null;
  // Use the same sanitize logic as in download-discover-images.js
  // Always use Unsplash dynamic image URLs for map thumbnails (smaller size)
  const q = encodeURIComponent((location || 'travel').split(',')[0]);
  return `https://source.unsplash.com/400x300/?${q}`;
}

// Helper to get place name from location
function getPlaceName(location) {
  if (!location) return '';
  return location.split(',')[0];
}

// Icon by type for timeline
function getTypeIcon(type, item) {
  if (type === 'roofed') return <BedDouble className="w-5 h-5 text-indigo-600" title="Accommodation" />;
  if (type === 'camp') return <Tent className="w-5 h-5 text-green-600" title="Camping" />;
  if (type === 'enroute') return <Car className="w-5 h-5 text-orange-500" title="Enroute" />;
  if (type === 'note') return <Info className="w-5 h-5 text-purple-500" title="Note" />;
  if (type === 'ferry' || (item && item.accommodation?.toLowerCase().includes('spirit'))) return <Ship className="w-5 h-5 text-blue-500" title="Ferry" />;
  if (type === 'car') return <Car className="w-5 h-5 text-gray-500" title="Car" />;
  return null;
}

// Geocode using Nominatim (OpenStreetMap)
async function geocodeLocation(location) {
  if (!location || typeof location !== 'string') return null;
  const tried = new Set();
  const clean = (s) => s.replace(/[\u2013\u2014\u2012]/g, ' ').replace(/\s+/g, ' ').trim();
  const stripPostcode = (s) => s.replace(/,?\s*[A-Za-z]{2,3}\s*\d{3,4},?\s*Australia/i, '').replace(/,?\s*TAS\s*\d{3,4},?\s*Australia/i, '').trim();

  const candidates = [];
  const original = clean(location);
  // --- caching helpers ---
  const normalizeKey = (s) => {
    try {
      return String((s || '').toLowerCase()).replace(/[\u2013\u2014\u2012]/g, ' ').replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
    } catch (e) { return String(s || '').toLowerCase(); }
  };

  const getGeocodeDocRef = (key) => {
    try {
      const pid = process.env.REACT_APP_FIREBASE_PROJECT_ID;
      if (!pid || !db) return null;
      return doc(db, `artifacts/${pid}/public/data/geocodes`, key);
    } catch (e) { return null; }
  };

  async function loadCachedGeocode(key) {
    // Try Firestore first
    try {
      const ref = getGeocodeDocRef(key);
      if (ref) {
        const snap = await getDoc(ref);
        if (snap && snap.exists && snap.exists()) {
          const data = snap.data ? snap.data() : (snap.data || snap);
          if (data && (data.lat || data.lng)) return { lat: Number(data.lat), lng: Number(data.lng), display_name: data.display_name || data.name || null };
        }
      }
    } catch (e) { /* ignore firestore read errors */ }
    // Then localStorage fallback
    try {
      const raw = localStorage.getItem(`tripGeocode:${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.lat || parsed.lng)) return { lat: Number(parsed.lat), lng: Number(parsed.lng), display_name: parsed.display_name || parsed.name || null };
    } catch (e) { /* ignore */ }
    return null;
  }

  async function saveCachedGeocode(key, payload) {
    if (!key || !payload) return false;
    // Write to Firestore if available
    try {
      const ref = getGeocodeDocRef(key);
      if (ref) {
        await setDoc(ref, { ...payload, updatedAt: new Date().toISOString() }, { merge: true });
      }
    } catch (e) { /* ignore write errors */ }
    // Always persist locally as well
    try {
      localStorage.setItem(`tripGeocode:${key}`, JSON.stringify({ ...payload, updatedAt: new Date().toISOString() }));
    } catch (e) { /* ignore */ }
    return true;
  }
  // --- end caching helpers ---
  candidates.push(original);
  // replace hyphens with space
  candidates.push(clean(original.replace(/[-–—]/g, ' ')));
  // remove postcode/state/country parts
  candidates.push(clean(stripPostcode(original)));
  // try first segment before comma
  const firstSeg = original.split(',')[0];
  if (firstSeg && firstSeg.length > 2) candidates.push(clean(firstSeg));
  // try first two segments
  const firstTwo = original.split(',').slice(0,2).join(',');
  if (firstTwo && firstTwo.length > 2) candidates.push(clean(firstTwo));

  for (const q of candidates) {
    if (!q) continue;
    if (tried.has(q)) continue;
    tried.add(q);
    // check cached geocode by normalized key before calling remote
    try {
      const key = normalizeKey(q);
      const cached = await loadCachedGeocode(key);
      if (cached) {
        console.debug('Geocode cache hit for', q, '->', cached);
        return cached;
      }
    } catch (e) { /* ignore cache read errors */ }
    try {
      console.debug('Geocoding attempt:', q);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          console.debug('Geocoding success for', q, { lat, lng, display_name: data[0].display_name });
          // persist successful geocode to cache
          try { await saveCachedGeocode(normalizeKey(q), { lat, lng, display_name: data[0].display_name }); } catch (e) {}
          return { lat, lng };
        }
      }
    } catch (err) {
      console.warn('Geocoding attempt failed for', q, err);
    }
  }
  console.debug('Geocoding: no results for any candidate for', location);

  // Offline fallback map for common sample locations (helps when Nominatim is not reachable
  // from the development environment). This is intentionally small and only used as a
  // development convenience.
  const FALLBACK_GEO = {
    'le marais': { lat: 48.8575, lng: 2.3580 },
    'île de la cité': { lat: 48.8530, lng: 2.3499 },
    'ile de la cite': { lat: 48.8530, lng: 2.3499 },
    'montmartre': { lat: 48.8867, lng: 2.3431 },
    'champs-Élysées': { lat: 48.8698, lng: 2.3076 },
    'champs-elysees': { lat: 48.8698, lng: 2.3076 },
    'versailles': { lat: 48.8049, lng: 2.1204 },
    'disneyland paris': { lat: 48.8722, lng: 2.7758 },
    'orly': { lat: 48.7233, lng: 2.3795 },
    'cdg': { lat: 49.0097, lng: 2.5479 },
    'le marais, paris': { lat: 48.8575, lng: 2.3580 },
    'montmartre, paris': { lat: 48.8867, lng: 2.3431 },
    'île de la cité, paris': { lat: 48.8530, lng: 2.3499 }
  };

  try {
    const key = clean(location).toLowerCase();
    for (const k of Object.keys(FALLBACK_GEO)) {
      if (key.indexOf(k) !== -1) {
        console.debug('Geocode fallback hit for', location, '->', FALLBACK_GEO[k]);
        return FALLBACK_GEO[k];
      }
    }
  } catch (e) { /* ignore fallback failures */ }

  return null;
}

// Get route using OSRM
async function getRoute(coordinates) {
  try {
    const coords = coordinates.map(coord => `${coord.lng},${coord.lat}`).join(';');
    console.log('OSRM request URL:', `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    console.log('OSRM response status:', response.status);
    const data = await response.json();
    console.log('OSRM response data:', data);
    if (data.routes && data.routes.length > 0) {
      return data.routes[0];
    }
  } catch (error) {
    console.error('Routing failed:', error);
  }
  return null;
}

// Create custom marker icon
function createCustomIcon(number, type, isActive, scale = 1, dateStr = '') {
  const size = 28 * scale;

  function formatDateShort(ds) {
    if (!ds) return '';
    try {
      const d = new Date(ds);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const month = d.toLocaleString(undefined, { month: 'short' });
        return `${day} ${month}`;
      }
      // fallback: return last segment if comma-separated
      const seg = String(ds).split(',')[0];
      return seg;
    } catch (e) { return String(ds).slice(0, 8); }
  }

  const dateLabel = formatDateShort(dateStr || '');
  const bg = isActive ? '#f59e42' : (type === 'roofed' || type === 'camp' ? '#2563eb' : type === 'enroute' ? '#f59e42' : '#4F46E5');
  const border = isActive ? '#f59e42' : 'white';

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: ${bg};
      border: 2px solid ${border};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      box-sizing: border-box;
    ">
      <div style="font-size: ${12 * scale}px; line-height: 1;">${number}</div>
      ${dateLabel ? `<div style=\"font-size: ${8 * scale}px; line-height:1; margin-top:2px; opacity:0.95; color: white; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;\">${dateLabel}</div>` : ''}
    </div>
  `;

  const className = `custom-marker${isActive ? ' active' : ''}`;

  return L.divIcon({ html, className, iconSize: [size, size], iconAnchor: [size/2, size/2] });
}

// Small on-screen debug overlay component
function DebugOverlay({ markers = [], attemptFly }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 1200, pointerEvents: 'auto' }}>
      <div>
        <button onClick={() => setOpen(s => !s)} style={{ padding: '6px 8px', background: '#111827', color: 'white', borderRadius: 6, fontSize: 12 }}>
          {open ? 'Hide Map Debug' : 'Show Map Debug'}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 8, width: 320, maxHeight: 320, overflow: 'auto', background: 'rgba(255,255,255,0.95)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Map markers</div>
          {(!markers || markers.length) === 0 && <div style={{ fontSize: 12, color: '#666' }}>No markers</div>}
          {(markers || []).map((m, i) => (
            <div key={`${m.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ flex: 1, fontSize: 12 }}>
                <div><strong>{m.id}</strong></div>
                <div style={{ color: '#666' }}>{Array.isArray(m.position) ? `${m.position[0].toFixed ? m.position[0].toFixed(4) : m.position[0]}, ${m.position[1].toFixed ? m.position[1].toFixed(4) : m.position[1]}` : String(m.position)}</div>
              </div>
              <div>
                <button onClick={() => { try { if (attemptFly) attemptFly(m.id); } catch (e) { console.warn(e); } }} style={{ padding: '4px 8px', fontSize: 12 }}>Fly</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Mount the legacy lite map into the placeholder using the dynamic loader
// iframe will be used to embed the remote demo instead of the dynamic loader

// Main TripMap component with Leaflet
// MapController attaches a reliable map fly helper using react-leaflet's useMap
function MapController({ markers, flyRequestsRef, flyRequestsVersion }) {
  const map = useMap();

  React.useEffect(() => {
    if (typeof window === 'undefined' || !map) return;

    // Process queued fly requests when they appear
    let processing = false;

    const processQueue = async () => {
      if (processing) return;
      processing = true;
      try {
        while (flyRequestsRef && flyRequestsRef.current && flyRequestsRef.current.length > 0) {
          const req = flyRequestsRef.current.shift();
          if (!req) continue;
          const { lat, lng, resolve, reject, zoom: reqZoom } = req;
          try {
            if (typeof map.invalidateSize === 'function') map.invalidateSize(true);
          } catch (e) {}

          const currentMapZoom = (typeof map.getZoom === 'function') ? map.getZoom() : 7;
          const targetZoom = (Number.isFinite(reqZoom) ? reqZoom : Math.max(currentMapZoom, 10));

          try {
            if (typeof map.setView === 'function') map.setView([lat, lng], targetZoom, { animate: false });
          } catch (e) { /* ignore */ }

          if (typeof map.flyTo === 'function') {
            try {
              map.flyTo([lat, lng], targetZoom, { animate: true, duration: 0.8 });
              // wait for moveend or timeout
              const result = await new Promise((res) => {
                let done = false;
                const onMoveEnd = () => { if (!done) { done = true; try { map.off('moveend', onMoveEnd); } catch {} ; res({ ok: true, lat, lng, zoom: targetZoom }); } };
                map.on('moveend', onMoveEnd);
                setTimeout(() => { if (!done) { done = true; try { map.off('moveend', onMoveEnd); } catch {} ; res({ ok: true, lat, lng, zoom: targetZoom }); } }, 1500);
              });
              try { resolve(result); } catch (e) {}
            } catch (e) {
              try { reject(e); } catch (err) {}
            }
          } else {
            try { resolve({ ok: true, lat, lng, zoom: targetZoom }); } catch (e) {}
          }
        }
      } finally { processing = false; }
    };

    // watch for external changes in the flyRequestsVersion to trigger processing
    const interval = setInterval(() => {
      if (flyRequestsRef && flyRequestsRef.current && flyRequestsRef.current.length > 0) processQueue();
    }, 120);

    // expose a limited logger for debugging
    window.__TRIPCRAFT_MAP_LOG_MARKERS__ = () => {
      try {
        const out = (markers || []).map(m => ({ id: m.id, index: m.index, position: Array.isArray(m.position) ? m.position : (m.position && typeof m.position === 'object' ? [m.position.lat ?? m.position[0], m.position.lng ?? m.position[1]] : null) }));
        return { ok: true, markers: out };
      } catch (e) { return { ok: false, error: String(e) }; }
    };

    // Kick off once in case requests already queued
    processQueue();

    return () => {
      clearInterval(interval);
      try { delete window.__TRIPCRAFT_MAP_LOG_MARKERS__; } catch (e) {}
    };
  }, [map, markers, flyRequestsRef, flyRequestsVersion]);

  return null;
}
function TripMap({ tripItems, currentTripId, loadingInitialData, onUpdateTravelTime, autoUpdateTravelTimes = false, onSaveRouteTimes = null, onAddItem = null }) {
  const [markers, setMarkers] = useState([]);
  const [route, setRoute] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(7);
  const [previewRoute, setPreviewRoute] = useState(null);
  const [previewTimes, setPreviewTimes] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  // Search UI state (Nominatim)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [accomNights, setAccomNights] = useState({});
  const [activeIndex, setActiveIndex] = useState(null);
  const [imageIndexes, setImageIndexes] = useState({});
  const [debugResult, setDebugResult] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const mapRef = React.useRef(null);
  const mountedRef = useRef(true);
  // POI overlay state
  const [poiMarkers, setPoiMarkers] = useState([]);
  const [poiStatus, setPoiStatus] = useState({ count: 0, lastFetchedAt: null, error: null });
  // POIs off by default
  const [selectedOverlays, setSelectedOverlays] = useState({ tourism: false });
  // Topo as default backdrop
  const [baseLayer, setBaseLayer] = useState('topo');
  const poiFetchTimer = useRef(null);
  const poiClusterRef = useRef(null);
  // Allow POIs to appear at a slightly lower zoom so users see results without heavy zooming
  const MIN_ZOOM_FOR_POIS = 8;
  // tourism subtype selectors
  const [tourismSubtypes, setTourismSubtypes] = useState({ museum: false, viewpoint: false, artwork: false, gallery: false, attraction: false, zoo: false, theme_park: false });
  // Queue for fly requests: each entry { id, lat, lng, resolve, reject }
  const flyRequestsRef = React.useRef([]);
  const flyRequestsVersion = React.useRef(0);
  const geocodeCacheRef = React.useRef({});
  const coordsByIndexRef = React.useRef({});
  const coordsByIdRef = React.useRef({});
  const lastAssembledTripRef = React.useRef(null);
  const ZOOM_INCLUDE_ENROUTE = 10; // zoom threshold to include 'enroute' points on the map

  // ---- Route segment cache helpers ----
  const getSegmentDocRef = (tripId, fromId, toId) => {
    if (!tripId) return null;
    const id = `${fromId || 'null'}__${toId || 'null'}`;
    try {
      return doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${tripId}/routeSegments`, id);
    } catch (e) {
      return null;
    }
  };

  async function loadSegmentFromServer(tripId, fromId, toId) {
    try {
      const ref = getSegmentDocRef(tripId, fromId, toId);
      if (!ref) return null;
      const snap = await getDoc(ref);
      if (!snap || !snap.exists()) return null;
      return snap.data();
    } catch (e) { console.warn('loadSegmentFromServer failed', e); return null; }
  }

  // localStorage fallback key
  const localKey = (tripId, fromId, toId) => `tripRouteSegment:${tripId}:${fromId || 'null'}:${toId || 'null'}`;

  async function loadSegmentCached(tripId, fromId, toId) {
    // Try Firestore first (if configured), else localStorage
    try {
      if (db && tripId) {
        const s = await loadSegmentFromServer(tripId, fromId, toId);
        if (s) return s;
      }
    } catch (e) { /* continue to local fallback */ }
    try {
      const k = localKey(tripId || 'local', fromId, toId);
      const raw = localStorage.getItem(k);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) { return null; }
  }

  async function saveSegmentCached(tripId, fromId, toId, segment) {
    try {
      if (db && tripId) {
        const ref = getSegmentDocRef(tripId, fromId, toId);
        if (ref) {
          await setDoc(ref, { ...segment, fromId, toId, updatedAt: new Date().toISOString() }, { merge: true });
          return true;
        }
      }
    } catch (e) { console.warn('saveSegmentCached firestore failed', e); }
    try {
      const k = localKey(tripId || 'local', fromId, toId);
      localStorage.setItem(k, JSON.stringify({ ...segment, fromId, toId, updatedAt: new Date().toISOString() }));
      return true;
    } catch (e) { console.warn('saveSegmentCached localStorage failed', e); }
    return false;
  }
  // ---- end cache helpers ----

  // Helper: create small green POI icon
  function createPoiIcon(label) {
    const html = `<div style="width:18px;height:18px;border-radius:4px;background:#10B981;border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:600">${label || ''}</div>`;
    return L.divIcon({ html, className: 'poi-div-icon', iconSize: [18, 18], iconAnchor: [9, 9] });
  }

  // Small helper to escape HTML for popup content
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Bridge function exposed to popup buttons to add an item via React callback
  useEffect(() => {
    window.__TRIPCRAFT_MAP_ADD_ITEM__ = (payload) => {
      try {
        if (typeof onAddItem === 'function') onAddItem(payload);
      } catch (e) { console.warn('Add item bridge failed', e); }
    };
    return () => { try { delete window.__TRIPCRAFT_MAP_ADD_ITEM__; } catch (e) {} };
  }, [onAddItem]);

  // Build Overpass query for selected overlays; bbox = south,west,north,east
  const buildOverpassQuery = (bbox, overlays, subtypes) => {
    const clauses = [];
    if (!overlays) return null;
    if (overlays.tourism) {
      const selected = subtypes ? Object.keys(subtypes).filter(k => !!subtypes[k]) : [];
      if (selected.length > 0) {
        for (const s of selected) {
          clauses.push(`node["tourism"="${s}"](${bbox});way["tourism"="${s}"](${bbox});relation["tourism"="${s}"](${bbox});`);
        }
      } else {
        clauses.push(`node["tourism"](${bbox});way["tourism"](${bbox});relation["tourism"](${bbox});`);
      }
    }
    // add other overlays later
    if (clauses.length === 0) return null;
    const q = `
      [out:json][timeout:25];
      (
        ${clauses.join('\n')}
      );
      out center 200;
    `;
    return q;
  };

  // Fetch POIs from Overpass for current bounds; debounced
  const fetchPoisForBounds = useCallback(async (force = false) => {
    try {
      if (!mapRef.current) return;
      const map = mapRef.current;
      const bounds = map.getBounds();
      const south = bounds.getSouth();
      const west = bounds.getWest();
      const north = bounds.getNorth();
      const east = bounds.getEast();
      const bbox = `${south},${west},${north},${east}`;
      const q = buildOverpassQuery(bbox, selectedOverlays, tourismSubtypes);
      if (!q) {
        setPoiMarkers([]);
        return;
      }
      // avoid huge bbox queries on low zoom levels unless forced
      const currentZoom = map.getZoom();
      console.debug('fetchPoisForBounds invoked', { currentZoom, MIN_ZOOM_FOR_POIS, force, selectedOverlays });
      if (!force && typeof currentZoom === 'number' && currentZoom < MIN_ZOOM_FOR_POIS) {
        // clear markers and update status so UI shows why nothing was fetched
        setPoiMarkers([]);
        setPoiStatus({ count: 0, lastFetchedAt: Date.now(), error: `zoom < ${MIN_ZOOM_FOR_POIS}`, lastQuery: null, lastResponseCount: 0 });
        console.debug('fetchPoisForBounds aborted due to zoom < MIN_ZOOM_FOR_POIS', { currentZoom, MIN_ZOOM_FOR_POIS });
        return;
      }
      // Use a light rate-limit / debounce
      if (poiFetchTimer.current) clearTimeout(poiFetchTimer.current);
      setPoiStatus({ count: 0, lastFetchedAt: Date.now(), error: null, lastQuery: null, lastResponseCount: 0 });
              poiFetchTimer.current = setTimeout(async () => {
        try {
          const url = 'https://overpass-api.de/api/interpreter';
          // update status to indicate fetch in-flight and store query
          setPoiStatus(prev => ({ ...prev, error: 'fetching', lastQuery: q, lastBbox: bbox }));
          console.debug('Overpass fetch: url=', url);
                  console.debug('Overpass fetch starting (this may be rate-limited). bbox=', bbox);
          console.debug('Overpass fetch: bbox=', bbox);
          console.debug('Overpass fetch: query=', q);
          const resp = await fetch(url, { method: 'POST', body: q, headers: { 'Content-Type': 'text/plain' } });
                  console.debug('Overpass fetch response status:', resp && resp.status);
          const data = await resp.json();
          console.debug('Overpass response elements count:', Array.isArray(data.elements) ? data.elements.length : 0);
          if (!data || !Array.isArray(data.elements)) { setPoiMarkers([]); setPoiStatus({ count: 0, lastFetchedAt: Date.now(), error: 'no-data' }); return; }
          const out = [];
          for (const el of data.elements.slice(0, 400)) {
            let lat = null; let lon = null;
            if (el.type === 'node') { lat = el.lat; lon = el.lon; }
            else if (el.type === 'way' || el.type === 'relation') { if (el.center) { lat = el.center.lat; lon = el.center.lon; } }
            if (!lat || !lon) continue;
            const name = (el.tags && (el.tags.name || el.tags['name:en'])) || el.tags && el.tags.tourism || '';
            const type = (el.tags && el.tags.tourism) || 'tourism';
            out.push({ id: `${el.type}_${el.id}`, lat, lon, name, type });
          }
          if (mountedRef.current) {
            setPoiMarkers(out);
            setPoiStatus({ count: out.length, lastFetchedAt: Date.now(), error: null, lastResponseCount: Array.isArray(data.elements) ? data.elements.length : out.length, lastQuery: q });
            console.debug('POI fetch succeeded — elements:', (data && Array.isArray(data.elements) ? data.elements.length : out.length));
          }
          console.debug('Parsed POIs:', out.length);
        } catch (err) { console.warn('Overpass fetch failed', err); setPoiMarkers([]); }
      }, 350);
    } catch (err) { console.warn('fetchPoisForBounds error', err); }
  }, [selectedOverlays]);

  // Trigger POI fetch when map moves or overlays change
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const onMoveEnd = () => { fetchPoisForBounds(); };
    map.on('moveend', onMoveEnd);
    map.on('zoomend', onMoveEnd);
    // initial
    fetchPoisForBounds();
    return () => {
      try { map.off('moveend', onMoveEnd); map.off('zoomend', onMoveEnd); } catch (e) {}
    };
  }, [fetchPoisForBounds]);

  useEffect(() => { return () => { mountedRef.current = false; if (poiFetchTimer.current) clearTimeout(poiFetchTimer.current); }; }, []);

  // Do not filter any item types: include all tripItems for mapping and sort by date for consistent ordering
  const mappableItems = Array.isArray(tripItems) ? tripItems : [];
  const sortedTripItems = mappableItems.slice().sort((a, b) => (a?.date || '').localeCompare(b?.date || ''));

  if (loadingInitialData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-indigo-700 text-xl">Loading trip data...</div>
      </div>
    );
  }

  if (mappableItems.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <h3 className="text-xl font-semibold text-indigo-700 mb-2">No mappable locations yet</h3>
        <p className="mb-4">Use the search below to find a place and add it to your trip.</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', minWidth: 320 }}>
            <input
              aria-label="Search place"
              placeholder="Find places (e.g. Mount Wellington)"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
              onFocus={() => setShowSearchResults(true)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const q = (searchQuery || '').trim();
                  if (!q) return;
                  setIsSearching(true);
                  try {
                    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8`);
                    const data = await resp.json();
                    setSearchResults(Array.isArray(data) ? data : []);
                  } catch (err) {
                    console.error('Search failed', err);
                    setSearchResults([]);
                  } finally { setIsSearching(false); }
                }
              }}
              className="px-3 py-2 border rounded-md text-sm w-full"
            />
            {showSearchResults && (searchResults || []).length > 0 && (
              <div style={{ position: 'absolute', top: '44px', left: 0, right: 0, zIndex: 1200 }}>
                <div className="bg-white rounded-md shadow-md max-h-64 overflow-auto">
                  {(searchResults || []).map((r, i) => (
                    <div key={`${r.place_id || i}`} className="p-2 border-b last:border-b-0 flex items-start justify-between">
                      <div style={{ flex: 1 }}>
                        <div className="text-sm font-semibold">{r.display_name.split(',')[0]}</div>
                        <div className="text-xs text-gray-500">{r.display_name}</div>
                      </div>
                      <div style={{ marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          type="button"
                          className="px-2 py-1 bg-indigo-600 text-white rounded text-xs"
                          onClick={async () => {
                            try {
                              const item = { location: r.display_name, title: r.display_name.split(',')[0], type: 'enroute', date: '', activityLink: '' };
                              if (typeof onAddItem === 'function') onAddItem(item);
                              const lat = parseFloat(r.lat);
                              const lon = parseFloat(r.lon);
                              if (mapRef.current && Number.isFinite(lat) && Number.isFinite(lon)) mapRef.current.setView([lat, lon], 13);
                            } catch (err) { console.error('Add place failed', err); }
                            setShowSearchResults(false);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          onClick={() => {
                            try {
                              const lat = parseFloat(r.lat);
                              const lon = parseFloat(r.lon);
                              if (mapRef.current && Number.isFinite(lat) && Number.isFinite(lon)) mapRef.current.setView([lat, lon], 13);
                            } catch (e) { console.warn('fly failed', e); }
                            setShowSearchResults(false);
                          }}
                        >
                          Fly
                        </button>
                      </div>
                    </div>
                  ))}
                  {isSearching && <div className="p-2 text-sm text-gray-500">Searching...</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const processLocations = useCallback(async () => {
    if (!sortedTripItems.length || isProcessing) return;
    setIsProcessing(true);

    try {
      const newMarkers = [];
      const coordinates = [];
      const newAccomNights = {};
      const coordsByIndex = {};

      // Count accommodation nights for roofed/camp grouping
      sortedTripItems.forEach(item => {
        if (item.type === 'roofed' || item.type === 'camp') {
          newAccomNights[item.location] = (newAccomNights[item.location] || 0) + (item.nights || 1);
        }
      });

      setAccomNights(newAccomNights);

      const visibleIndices = [];
      for (let i = 0; i < sortedTripItems.length; i++) {
        const item = sortedTripItems[i];
        // Include all item types (do not skip notes)

        // Prefer explicit coords coming from an item (e.g. photo upload) before geocoding
        let coords = null;
        try {
          if (item.coords && Array.isArray(item.coords) && item.coords.length >= 2) {
            coords = { lat: Number(item.coords[0]), lng: Number(item.coords[1]) };
          } else if (item.gps && (item.gps.latitude || item.gps.longitude)) {
            coords = { lat: Number(item.gps.latitude), lng: Number(item.gps.longitude) };
          }
        } catch (e) {
          coords = null;
        }

        // Try cached geocode by location only if we still don't have coords
        if (!coords) {
          const cached = geocodeCacheRef.current[item.location];
          if (cached) coords = cached;
        }

        if (!coords) {
          const geocoded = await geocodeLocation(item.location);
          if (geocoded) {
            coords = geocoded;
            try { geocodeCacheRef.current[item.location] = geocoded; } catch (e) {}
          }
        }

        if (!coords) continue;

  coordsByIndex[i] = coords;
  visibleIndices.push(i);
  if (item && item.id) coordsByIdRef.current[item.id] = coords;

  // Include all item types on the map (no type-based filtering)
  const includeInMap = true;
        if (includeInMap) {
          coordinates.push(coords);
          const markerPos = [Number(coords.lat), Number(coords.lng)];
          const scale = (item.type === 'roofed' || item.type === 'camp') ? 1 + 0.2 * (newAccomNights[item.location] - 1) : 0.8;
          const labelIndex = (typeof item.displayIndex === 'number') ? item.displayIndex : (i + 1);
          const marker = {
            id: item.id,
            position: markerPos,
            item,
            index: i,
            icon: createCustomIcon(labelIndex, item.type, activeIndex === i, scale, item.date)
          };
          newMarkers.push(marker);

          if (onUpdateTravelTime) {
            onUpdateTravelTime(item.id, item.travelTime || null, item.distance || null, coords);
          }
        }
      }

      // Save coords by index for lookup when flying to items not currently rendered as markers
      coordsByIndexRef.current = coordsByIndex;
      setMarkers(newMarkers);

      // Route only if we have at least two visible coordinates
      if (coordinates.length > 1) {
        // Avoid spamming the console when currentTripId is repeatedly null/undefined
        const tid = (typeof currentTripId !== 'undefined' && currentTripId !== null) ? currentTripId : 'local';
        if (lastAssembledTripRef.current !== tid) {
          console.log('Assembling route using cached segments where available for trip:', tid);
          lastAssembledTripRef.current = tid;
        }
        // Build consecutive pairs using visibleIndices and attempt to load cached segments for each
        const segments = []; // will hold { fromIdx, toIdx, segment } where indices are sortedTripItems indices
        for (let k = 0; k < visibleIndices.length - 1; k++) {
          const fromIdx = visibleIndices[k];
          const toIdx = visibleIndices[k + 1];
          const from = sortedTripItems[fromIdx];
          const to = sortedTripItems[toIdx];
          const fromId = from && from.id ? from.id : String(fromIdx);
          const toId = to && to.id ? to.id : String(toIdx);
          const cached = await loadSegmentCached(currentTripId, fromId, toId);
          if (cached && cached.geometry && Array.isArray(cached.geometry.coordinates)) {
            segments.push({ fromIdx, toIdx, segment: cached });
          } else {
            segments.push({ fromIdx, toIdx, segment: null });
          }
        }

        // For any missing segments, call OSRM per-pair (small requests) and persist results
        for (const seg of segments) {
          if (seg.segment) continue;
          const fromIdx = seg.fromIdx;
          const toIdx = seg.toIdx;
          const coordsForRequest = [
            { lat: Number(coordsByIndex[fromIdx].lat), lng: Number(coordsByIndex[fromIdx].lng) },
            { lat: Number(coordsByIndex[toIdx].lat), lng: Number(coordsByIndex[toIdx].lng) }
          ];
          try {
            const routeData = await getRoute(coordsForRequest);
            if (routeData && routeData.geometry) {
              seg.segment = { geometry: routeData.geometry, legs: routeData.legs, duration: routeData.duration || null, distance: routeData.distance || null };
              // Save segment to cache
              const fromId = sortedTripItems[fromIdx].id || String(fromIdx);
              const toId = sortedTripItems[toIdx].id || String(toIdx);
              try { await saveSegmentCached(currentTripId, fromId, toId, seg.segment); } catch (e) { console.warn('Failed to save segment', e); }
            } else {
              console.warn('OSRM returned no geometry for pair', fromIdx, toIdx);
            }
          } catch (e) { console.warn('OSRM pair request failed', e); }
        }

        // Assemble full route by concatenating geometries in order
        const fullCoords = [];
        const travelTimesByDestination = {}; // map destination itemId -> { duration, distance }
        for (const seg of segments) {
          if (!seg.segment || !seg.segment.geometry || !Array.isArray(seg.segment.geometry.coordinates)) continue;
          const coordsArr = seg.segment.geometry.coordinates.map(c => [c[1], c[0]]);
          // Avoid duplicating the connecting point: skip first point if fullCoords already has last
          if (fullCoords.length > 0) coordsArr.shift();
          fullCoords.push(...coordsArr);
          // If legs available, extract first leg's duration/distance as the travelTime to the destination
          if (seg.segment.legs && Array.isArray(seg.segment.legs) && seg.segment.legs.length > 0) {
            const leg = seg.segment.legs[0];
            const duration = `${Math.round(leg.duration / 60)} mins`;
            const distance = `${(leg.distance / 1000).toFixed(1)} km`;
            const destIdx = seg.toIdx;
            const destItem = sortedTripItems[destIdx];
            if (destItem && destItem.id) travelTimesByDestination[destItem.id] = { duration, distance };
          }
        }

        if (fullCoords.length > 0) {
          setRoute(fullCoords);
          // Update travel times using cached/computed legs
          if (autoUpdateTravelTimes && onUpdateTravelTime) {
            for (const [itemId, vals] of Object.entries(travelTimesByDestination)) {
              try { onUpdateTravelTime(itemId, vals.duration, vals.distance, null); } catch (e) {}
            }
          }
        } else {
          console.log('No assembled coords available from cached segments');
        }
      } else {
        setRoute(null);
        console.log('Not enough coordinates for routing:', coordinates.length);
      }
    } catch (error) {
      console.error('Error processing locations:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [sortedTripItems, isProcessing, onUpdateTravelTime, activeIndex, currentZoom, currentTripId]);

  useEffect(() => {
    processLocations();
  }, [processLocations]);

  // Update marker icons when activeIndex changes so the active marker gets the 'active' CSS class
  useEffect(() => {
    if (!markers || markers.length === 0) return;
    setMarkers(prev => prev.map(m => ({
      ...m,
      icon: createCustomIcon((typeof m.item.displayIndex === 'number' ? m.item.displayIndex : (m.index + 1)), m.item.type, activeIndex === m.index, 1, m.item && m.item.date)
    })));
  }, [activeIndex]);

  // Attempt to fly to a marker by index. This centralizes behavior and provides a fallback
  // using the debug helper when the map instance is not available or flyTo fails.
  const attemptFly = useCallback(async (identifier) => {
    try {
      console.debug('attemptFly called with', identifier);
      // identifier may be an item id (string) or an index (number)
      let targetIndex = null;
      let id = null;

      if (typeof identifier === 'string') {
        id = identifier;
        targetIndex = sortedTripItems.findIndex(it => it && it.id === id);
        if (targetIndex === -1) targetIndex = null;
      } else {
        const i = Number(identifier);
        if (!Number.isFinite(i)) return { ok: false, error: 'invalid-index' };
        targetIndex = i;
        id = sortedTripItems[i]?.id;
      }

      // Find a marker by id first, then by index
      let marker = null;
      if (id) marker = markers.find(m => m.id === id);
      if (!marker && typeof targetIndex === 'number') {
        marker = markers.find(m => m.index === targetIndex) || markers[targetIndex];
      }
      console.debug('attemptFly: initial marker lookup ->', { markerFound: !!marker, marker });

      // If marker not found (hidden due to zoom filters), try coordsByIdRef or coordsByIndexRef or geocode cache
      if (!marker) {
        let cached = null;
        if (id && coordsByIdRef.current[id]) cached = coordsByIdRef.current[id];
        else if (typeof targetIndex === 'number' && coordsByIndexRef.current[targetIndex]) cached = coordsByIndexRef.current[targetIndex];

        if (cached) {
          const item = (typeof targetIndex === 'number') ? sortedTripItems[targetIndex] : (id ? sortedTripItems.find(it => it.id === id) : null);
          marker = { id: item?.id, position: [Number(cached.lat), Number(cached.lng)], item, index: targetIndex != null ? targetIndex : (item ? sortedTripItems.findIndex(it => it.id === item.id) : null), icon: createCustomIcon((targetIndex != null ? (targetIndex + 1) : 1), item?.type, false, 0.9, item && item.date) };
        } else if (typeof targetIndex === 'number' && sortedTripItems[targetIndex]) {
          // try on-demand geocode fallback using the item's location
          const coords = await geocodeLocation(sortedTripItems[targetIndex].location);
          if (coords) {
            const item = sortedTripItems[targetIndex];
            marker = { id: item.id, position: [Number(coords.lat), Number(coords.lng)], item, index: targetIndex, icon: createCustomIcon(targetIndex+1, item?.type, false, 0.9, item && item.date) };
            // cache it for future
            geocodeCacheRef.current[sortedTripItems[targetIndex].location] = coords;
            coordsByIndexRef.current[targetIndex] = coords;
            if (item && item.id) coordsByIdRef.current[item.id] = coords;
          }
        } else if (id) {
          // find by id in sortedTripItems and geocode
          const idx = sortedTripItems.findIndex(it => it && it.id === id);
          if (idx !== -1) {
            const coords = await geocodeLocation(sortedTripItems[idx].location);
            if (coords) {
              const item = sortedTripItems[idx];
              marker = { id: item.id, position: [Number(coords.lat), Number(coords.lng)], item, index: idx, icon: createCustomIcon(idx+1, item?.type, false, 0.9, item && item.date) };
              geocodeCacheRef.current[sortedTripItems[idx].location] = coords;
              coordsByIndexRef.current[idx] = coords;
              if (item && item.id) coordsByIdRef.current[item.id] = coords;
              targetIndex = idx;
            }
          }
        }
      }

      if (!marker) {
        console.debug('attemptFly: marker still not found after fallbacks', { id, targetIndex, coordsById: coordsByIdRef.current[id], coordsByIndex: coordsByIndexRef.current[targetIndex] });
        return { ok: false, error: 'marker-not-found', id, index: targetIndex };
      }

      // Resolve the index if not already known
      const resolvedIndex = (typeof marker.index === 'number' && Number.isFinite(marker.index)) ? marker.index : (typeof targetIndex === 'number' ? targetIndex : sortedTripItems.findIndex(it => it && it.id === marker.id));
      if (resolvedIndex != null && resolvedIndex !== -1) setActiveIndex(resolvedIndex);

      // parse coords robustly (we store marker.position as [lat, lng])
      let lat, lng;
      if (Array.isArray(marker.position) && marker.position.length >= 2) {
        lat = Number(marker.position[0]);
        lng = Number(marker.position[1]);
      } else if (marker.position && typeof marker.position === 'object') {
        lat = Number(marker.position.lat ?? marker.position[0]);
        lng = Number(marker.position.lng ?? marker.position[1]);
      } else {
        lat = NaN; lng = NaN;
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn('attemptFly: invalid coords', marker.position);
        return { ok: false, error: 'invalid-coords' };
      }

      // Decide a requested zoom: if the item is 'enroute' and current zoom is low, request a closer zoom
      const desiredZoom = (marker && marker.item && marker.item.type === 'enroute' && currentZoom < ZOOM_INCLUDE_ENROUTE) ? Math.max(ZOOM_INCLUDE_ENROUTE, currentZoom + 2) : undefined;

      const p = new Promise((resolve, reject) => {
        flyRequestsRef.current.push({ id: marker.id, index: resolvedIndex, lat, lng, zoom: desiredZoom, resolve, reject });
        flyRequestsVersion.current += 1;
      });

      try {
        const result = await p;
        return { ok: true, id: marker.id, index: resolvedIndex, lat, lng, ...(result || {}) };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    } catch (err) {
      console.warn('attemptFly unexpected error', err);
      return { ok: false, error: String(err) };
    }
  }, [markers, mapInstance, currentZoom, sortedTripItems]);

  // Wire marker/timeline clicks to attemptFly (safe to call repeatedly)
  useEffect(() => {
    // No-op effect; defined so attemptFly has stable identity for children
  }, [attemptFly]);

  // Debug helpers are removed from window; DebugOverlay uses local props instead

  // Cleanup wheel handler if we attached it to the map container
  useEffect(() => {
    return () => {
      try {
        const m = mapRef.current;
        if (m && m.getContainer) {
          const container = m.getContainer();
          if (container && container.__tripcraft_wheel_attached) {
            try {
              container.removeEventListener('wheel', container.__tripcraft_wheel_attached.handler);
              if (container.__tripcraft_wheel_attached.windowHandler) {
                try { window.removeEventListener('wheel', container.__tripcraft_wheel_attached.windowHandler, { capture: true }); } catch (e) {}
              }
            } catch (e) { /* ignore */ }
            try { delete container.__tripcraft_wheel_attached; } catch (e) {}
          }
        }
      } catch (e) { /* ignore */ }
    };
  }, []);

  const center = markers.length > 0
    ? markers[0].position
    : [-41.4545, 147.1595]; // Default to Tasmania

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-indigo-700 mb-2">Trip Route Map</h3>
        <p className="text-gray-600 text-sm flex flex-wrap gap-1 items-center">
          {sortedTripItems.length === 1
            ? <>
                Showing location: <span>{getPlaceName(sortedTripItems[0].location)}</span>
              </>
            : <>
                Route through {sortedTripItems.length} locations: {
                  sortedTripItems.map((item, idx) => {
                    let color = 'text-gray-700';
                    let font = '';
                    if (item.type === 'roofed') { color = 'text-indigo-700'; font = 'font-bold'; }
                    else if (item.type === 'camp') { color = 'text-green-700'; font = 'font-bold'; }
                    else if (item.type === 'enroute') color = 'text-orange-600';
                    else if (item.type === 'note') color = 'text-purple-600';
                    else if (item.type === 'ferry') color = 'text-blue-600';
                    const displayIndex = idx + 1;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`${color} ${font} text-left px-1 py-0.5 rounded hover:bg-gray-100`}
                        title={`Fly to ${getPlaceName(item.location)}`}
                        aria-label={`Fly to ${getPlaceName(item.location)}`}
                        onClick={async () => { try { await attemptFly(item.id); } catch (e) { console.warn('Header fly failed', e); } }}
                      >
                        {displayIndex}. {getPlaceName(item.location)}{idx < sortedTripItems.length-1 && <span className="text-gray-400"> --&gt; </span>}
                      </button>
                    );
                  })
                }
              </>
          }
          {/* All items are shown on the map; no items are excluded */}
        </p>
        <p className="text-blue-600 text-xs mt-1">
          💡 Travel times will be automatically calculated and updated based on OpenStreetMap routing data
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-lg">
        <div className="relative">
          <div className="p-3 flex items-center gap-3">
            {/* Search box: Nominatim (OpenStreetMap) to find places and add to trip */}
            <div style={{ position: 'relative', minWidth: 260 }}>
              <input
                aria-label="Search place"
                placeholder="Find places (e.g. Mount Wellington)"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                onFocus={() => setShowSearchResults(true)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // perform search
                    try {
                      const q = (searchQuery || '').trim();
                      if (!q) return;
                      setIsSearching(true);
                      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8`);
                      const data = await resp.json();
                      setSearchResults(Array.isArray(data) ? data : []);
                    } catch (err) {
                      console.error('Search failed', err);
                      setSearchResults([]);
                    } finally { setIsSearching(false); }
                  }
                }}
                className="px-3 py-1 border rounded-md text-sm w-full"
              />
              {showSearchResults && (searchResults || []).length > 0 && (
                <div style={{ position: 'absolute', top: '36px', left: 0, right: 0, zIndex: 1200 }}>
                  <div className="bg-white rounded-md shadow-md max-h-64 overflow-auto">
                    {(searchResults || []).map((r, i) => (
                      <div key={`${r.place_id || i}`} className="p-2 border-b last:border-b-0 flex items-start justify-between">
                        <div style={{ flex: 1 }}>
                          <div className="text-sm font-semibold">{r.display_name.split(',')[0]}</div>
                          <div className="text-xs text-gray-500">{r.display_name}</div>
                        </div>
                        <div style={{ marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <button
                            type="button"
                            className="px-2 py-1 bg-indigo-600 text-white rounded text-xs"
                            onClick={async () => {
                              try {
                                const lat = parseFloat(r.lat);
                                const lon = parseFloat(r.lon);
                                const item = { location: r.display_name, title: r.display_name.split(',')[0], type: 'enroute', date: '', activityLink: '' };
                                if (typeof onAddItem === 'function') {
                                  onAddItem(item);
                                } else {
                                  // fallback: stage locally by simulating a travel-time update
                                  console.info('onAddItem not provided; place found:', item.location);
                                }
                                if (mapRef.current && Number.isFinite(lat) && Number.isFinite(lon)) {
                                  try { mapRef.current.setView([lat, lon], 13); } catch (e) { console.warn('fly-to failed', e); }
                                }
                              } catch (err) { console.error('Add place failed', err); }
                              setShowSearchResults(false);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            onClick={() => {
                              try {
                                const lat = parseFloat(r.lat);
                                const lon = parseFloat(r.lon);
                                if (mapRef.current && Number.isFinite(lat) && Number.isFinite(lon)) mapRef.current.setView([lat, lon], 13);
                              } catch (e) { console.warn('fly failed', e); }
                              setShowSearchResults(false);
                            }}
                          >
                            Fly
                          </button>
                        </div>
                      </div>
                    ))}
                    {isSearching && <div className="p-2 text-sm text-gray-500">Searching...</div>}
                  </div>
                </div>
              )}
            </div>
            {/* Compute Preview button removed — not used in current flow */}
            {/* map-local debug controls removed (use DebugPanel in TripDashboard instead) */}
          </div>
          {/* Persistent floating search control (top-left) */}
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1400, pointerEvents: 'auto' }}>
            <div className="bg-white rounded-md shadow p-2" style={{ minWidth: 260 }}>
              <input
                aria-label="Map search"
                placeholder="Search places (press Enter)"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const q = (searchQuery || '').trim();
                    if (!q) return;
                    setIsSearching(true);
                    try {
                      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8`);
                      const data = await resp.json();
                      setSearchResults(Array.isArray(data) ? data : []);
                    } catch (err) {
                      console.error('Search failed', err);
                      setSearchResults([]);
                    } finally { setIsSearching(false); }
                  }
                }}
                className="px-2 py-1 border rounded text-sm w-full"
              />
              {showSearchResults && (searchResults || []).length > 0 && (
                <div className="mt-2 bg-white rounded shadow max-h-64 overflow-auto">
                  {(searchResults || []).map((r, i) => (
                    <div key={`${r.place_id || i}`} className="p-2 border-b last:border-b-0 flex items-start justify-between">
                      <div style={{ flex: 1 }}>
                        <div className="text-sm font-semibold">{r.display_name.split(',')[0]}</div>
                        <div className="text-xs text-gray-500">{r.display_name}</div>
                      </div>
                      <div style={{ marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          type="button"
                          className="px-2 py-1 bg-indigo-600 text-white rounded text-xs"
                          onClick={async () => {
                            try {
                              const item = { location: r.display_name, title: r.display_name.split(',')[0], type: 'enroute', date: '', activityLink: '' };
                              if (typeof onAddItem === 'function') onAddItem(item);
                              const lat = parseFloat(r.lat);
                              const lon = parseFloat(r.lon);
                              if (mapRef.current && Number.isFinite(lat) && Number.isFinite(lon)) mapRef.current.setView([lat, lon], 13);
                            } catch (err) { console.error('Add place failed', err); }
                            setShowSearchResults(false);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          onClick={() => {
                            try {
                              const lat = parseFloat(r.lat);
                              const lon = parseFloat(r.lon);
                              if (mapRef.current && Number.isFinite(lat) && Number.isFinite(lon)) mapRef.current.setView([lat, lon], 13);
                            } catch (e) { console.warn('fly failed', e); }
                            setShowSearchResults(false);
                          }}
                        >
                          Fly
                        </button>
                      </div>
                    </div>
                  ))}
                  {isSearching && <div className="p-2 text-sm text-gray-500">Searching...</div>}
                </div>
              )}
            </div>
          </div>

          {/* Embed remote demo in an iframe */}
            <div style={{ height: '500px', width: '100%', borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              {/* Render the interactive Leaflet map directly so routes/waypoints are driven by React state */}
              <MapContainer
                whenCreated={(m) => { mapRef.current = m; setMapInstance(m); }}
                center={center}
                zoom={currentZoom || 7}
                style={{ width: '100%', height: '100%' }}
              >
                {/* base layers */}
                {baseLayer === 'topo' && <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" attribution="© OpenTopoMap contributors" />}
                {baseLayer === 'carto' && <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png" attribution="© CartoDB" />}
                {baseLayer === 'osm' && <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />}

                {/* controller to process fly requests */}
                <MapController markers={markers} flyRequestsRef={flyRequestsRef} flyRequestsVersion={flyRequestsVersion.current} />

                {/* route polyline */}
                {route && Array.isArray(route) && route.length > 0 && (
                  <Polyline positions={route} pathOptions={{ color: '#f59e42', weight: 4, opacity: 0.9 }} />
                )}

                {/* markers from trip items */}
                {(markers || []).map((m) => (
                  <Marker key={m.id || `${m.index}`} position={m.position} icon={m.icon}>
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div style={{ fontWeight: 700 }}>{escapeHtml(getPlaceName(m.item && m.item.location))}</div>
                        {m.item && m.item.type && <div style={{ fontSize: 12, color: '#666' }}>{m.item.type}</div>}
                        {m.item && m.item.status === 'Completed' && (
                          <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>✓ Completed</div>
                        )}
                        {m.item && m.item.photos && (() => {
                          const photoUrls = typeof m.item.photos === 'string' ? m.item.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
                          return photoUrls.length > 0 && (
                            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {photoUrls.slice(0, 3).map((url, idx) => (
                                <img key={idx} src={url} alt="Trip photo" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
                              ))}
                              {photoUrls.length > 3 && <div style={{ fontSize: 11, color: '#666', alignSelf: 'center' }}>+{photoUrls.length - 3} more</div>}
                            </div>
                          );
                        })()}
                        <div style={{ marginTop: 6 }}>
                          <button onClick={async () => { try { await attemptFly(m.id || m.index); } catch (e) { console.warn(e); } }} style={{ padding: '6px 8px', background: '#4F46E5', color: '#fff', border: 0, borderRadius: 4 }}>Fly</button>
                          <button onClick={() => { try { if (typeof window.__TRIPCRAFT_MAP_ADD_ITEM__ === 'function') window.__TRIPCRAFT_MAP_ADD_ITEM__({ location: m.item.location, title: getPlaceName(m.item.location), type: m.item.type || 'enroute' }); } catch (e) { console.warn(e); } }} style={{ marginLeft: 8, padding: '6px 8px', background: '#f3f4f6', border: 0, borderRadius: 4 }}>Add</button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* POI cluster manager (imperative) */}
                <ClusterManager mapRef={mapRef} poiMarkers={poiMarkers} selectedOverlays={selectedOverlays} createPoiIcon={createPoiIcon} escapeHtml={escapeHtml} attemptFly={attemptFly} />
              </MapContainer>
            </div>

          {/* Right-side overlay controls removed here — legacy loader renders those UI elements */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1400, pointerEvents: 'auto' }}>
            <div className="bg-white rounded-md shadow p-3" style={{ width: 220 }}>
              <div className="font-semibold text-sm mb-2">Base Layer</div>
              <div className="flex flex-col gap-1 mb-3">
                <label><input type="radio" name="base" checked={baseLayer==='osm'} onChange={() => setBaseLayer('osm')} /> <span className="ml-2">Mapnik (OSM)</span></label>
                <label><input type="radio" name="base" checked={baseLayer==='topo'} onChange={() => setBaseLayer('topo')} /> <span className="ml-2">Topo</span></label>
              </div>
              <div className="font-semibold text-sm mb-2">Overlays</div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!selectedOverlays.tourism} onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectedOverlays(prev => ({ ...prev, tourism: checked }));
                    // when toggled on, enable all tourism subtypes; when toggled off, clear them
                    setTourismSubtypes({ museum: checked, viewpoint: checked, artwork: checked, gallery: checked, attraction: checked, zoo: checked, theme_park: checked });
                  }} /> <span>Tourism POIs</span></label>
                {selectedOverlays.tourism && (
                  <div className="ml-4 mt-2 flex flex-col gap-1 text-sm">
                    <label><input type="checkbox" checked={!!tourismSubtypes.museum} onChange={(e) => setTourismSubtypes(s => ({ ...s, museum: e.target.checked }))} /> <span className="ml-2">Museum</span></label>
                    <label><input type="checkbox" checked={!!tourismSubtypes.viewpoint} onChange={(e) => setTourismSubtypes(s => ({ ...s, viewpoint: e.target.checked }))} /> <span className="ml-2">Viewpoint</span></label>
                    <label><input type="checkbox" checked={!!tourismSubtypes.artwork} onChange={(e) => setTourismSubtypes(s => ({ ...s, artwork: e.target.checked }))} /> <span className="ml-2">Artwork</span></label>
                    <label><input type="checkbox" checked={!!tourismSubtypes.gallery} onChange={(e) => setTourismSubtypes(s => ({ ...s, gallery: e.target.checked }))} /> <span className="ml-2">Gallery</span></label>
                    <label><input type="checkbox" checked={!!tourismSubtypes.attraction} onChange={(e) => setTourismSubtypes(s => ({ ...s, attraction: e.target.checked }))} /> <span className="ml-2">Attraction</span></label>
                    <label><input type="checkbox" checked={!!tourismSubtypes.zoo} onChange={(e) => setTourismSubtypes(s => ({ ...s, zoo: e.target.checked }))} /> <span className="ml-2">Zoo</span></label>
                    <label><input type="checkbox" checked={!!tourismSubtypes.theme_park} onChange={(e) => setTourismSubtypes(s => ({ ...s, theme_park: e.target.checked }))} /> <span className="ml-2">Theme Park</span></label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isProcessing && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-1000">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-2"></div>
                <div className="text-indigo-700 font-medium">Loading routes...</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable mini-timeline */}
      <div className="mt-4">
        <h4 className="text-lg font-semibold text-indigo-700 mb-2">Trip Timeline</h4>
        <div className="flex flex-wrap gap-3 pb-2">
          {sortedTripItems.map((item, index) => {
            const isActive = activeIndex === index;
            const displayIndex = index + 1;
            const imgIdx = imageIndexes[item.id] || 0;
            // Prioritize user photos, then fall back to discover images or generated image
            const userPhotos = item.photos && typeof item.photos === 'string' 
              ? item.photos.split(',').map(u => u.trim()).filter(Boolean) 
              : [];
            const fallbackImages = Array.isArray(item.discoverImages) ? item.discoverImages : [getLocalDiscoverImage(item.location)];
            const images = userPhotos.length > 0 ? userPhotos : fallbackImages;
            const showPrev = images.length > 1;
            const showNext = images.length > 1;
            const activityLabel = (() => {
              try {
                if (item.activities && typeof item.activities === 'string' && item.activities.trim()) {
                  const s = item.activities.replace(/\s+/g, ' ').trim();
                  return s.split('.').shift().split(',').shift().split(';').shift().split('\n').shift().slice(0, 40);
                }
                // Fallback to the item type as a readable label
                if (item.type) return item.type.replace(/_/g, ' ');
                return '';
              } catch (e) { return ''; }
            })();
            const dateLabel = (() => {
              try {
                if (!item || !item.date) return '';
                const d = new Date(item.date);
                if (!isNaN(d.getTime())) return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                return String(item.date).split('T')[0];
              } catch (e) { return ''; }
            })();
            const handlePrev = (e) => {
              e.stopPropagation();
              setImageIndexes(idxes => ({ ...idxes, [item.id]: ((idxes[item.id] || 0) - 1 + images.length) % images.length }));
            };
            const handleNext = (e) => {
              e.stopPropagation();
              setImageIndexes(idxes => ({ ...idxes, [item.id]: ((idxes[item.id] || 0) + 1) % images.length }));
            };
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={`flex flex-col items-center w-[90px] px-2 py-2 rounded-lg border transition-all duration-150 focus:outline-none ${
                  isActive ? 'border-orange-400 bg-orange-50 shadow' : 'border-gray-200 bg-gray-50'
                }`}
                onClick={async () => {
                  try {
                    await attemptFly(item.id);
                  } catch (e) {
                    console.warn('Timeline click attemptFly failed', e);
                    setActiveIndex(index);
                  }
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    try { await attemptFly(item.id); } catch (err) { setActiveIndex(index); }
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className="mb-1 relative block w-14 h-14 rounded-full overflow-hidden bg-gray-100" style={{marginBottom: 4}}>
                  {/* Cycling discover images */}
                  <img
                    src={images[imgIdx]}
                    alt={getPlaceName(item.location)}
                    className="object-cover w-full h-full"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  {/* Type icon top-left with color matching item type */}
                  <span className="absolute top-0 left-0 m-1 rounded-full p-1" style={{width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',backgroundColor: item.type === 'roofed' ? '#818cf8' : item.type === 'camp' ? '#16a34a' : item.type === 'enroute' ? '#ea580c' : item.type === 'note' ? '#a855f7' : item.type === 'ferry' ? '#3b82f6' : '#6b7280'}}>
                    {getTypeIcon(item.type, item)}
                  </span>
                  {/* Small overlay at bottom for activity label */}
                  {activityLabel && (
                    <div className="absolute left-0 right-0 bottom-0 px-1 py-0.5 text-[10px] text-white" style={{background:'linear-gradient(180deg, rgba(0,0,0,0.0), rgba(0,0,0,0.6))', textAlign:'center', textShadow:'-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000'}}>
                      {String(activityLabel).length > 30 ? String(activityLabel).slice(0,27) + '…' : activityLabel}
                    </div>
                  )}
                  {/* Fly badge (index + date) top-right badge for quick fly - larger to fit date */}
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 text-white font-semibold rounded-full flex items-center justify-center"
                    style={{width:48,height:48,backgroundColor:'#4f46e5',display:'flex',alignItems:'center',justifyContent:'center'}}
                    title={`Fly to ${getPlaceName(item.location)}`}
                    aria-label={`Fly to ${getPlaceName(item.location)}`}
                    onClick={(e) => { e.stopPropagation(); try { attemptFly(item.id); } catch (err) { console.warn('badge fly failed', err); } }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                      <div style={{ fontSize: 12 }}>{displayIndex}</div>
                      {dateLabel && <div style={{ fontSize: 9, opacity: 0.95, marginTop: 2, color: 'white', textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>{dateLabel}</div>}
                    </div>
                  </button>
                  {showPrev && (
                    <button type="button" className="absolute left-0 top-1/2 -translate-y-1/2 bg-white bg-opacity-60 rounded-full px-1 text-xs" onClick={handlePrev}>&lt;</button>
                  )}
                  {showNext && (
                    <button type="button" className="absolute right-0 top-1/2 -translate-y-1/2 bg-white bg-opacity-60 rounded-full px-1 text-xs" onClick={handleNext}>&gt;</button>
                  )}
                </span>
                <span className="font-semibold text-gray-800 text-xs truncate max-w-[70px]">{getPlaceName(item.location)}</span>
                {(item.travelTime || item.distance) && (
                  <span className="text-[10px] text-gray-500 mt-1 text-center">
                    {item.travelTime}{item.travelTime && item.distance ? ' • ' : ''}{item.distance}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TripMap;

// ClusterManager: imperative component to manage Leaflet.markercluster markers
function ClusterManager({ mapRef, poiMarkers, selectedOverlays, createPoiIcon, escapeHtml, attemptFly }) {
  const clusterRef = useRef(null);

  useEffect(() => {
    const map = mapRef && mapRef.current;
    if (!map) return;

    // If overlay not selected, remove cluster group
    if (!selectedOverlays || !selectedOverlays.tourism) {
      try {
        if (clusterRef.current) {
          map.removeLayer(clusterRef.current);
          clusterRef.current = null;
        }
      } catch (e) { console.warn('Removing cluster failed', e); }
      return;
    }

    // Ensure markercluster plugin is available
    const pluginAvailable = !!L.markerClusterGroup;
    if (!pluginAvailable) {
      console.warn('MarkerCluster plugin not available — falling back to plain markers');
    }

  console.debug('ClusterManager running, poiMarkers count:', (poiMarkers || []).length);
    // Create or reuse cluster group or a plain marker container
    if (!clusterRef.current) {
      if (pluginAvailable) {
        clusterRef.current = L.markerClusterGroup({ chunkedLoading: true, removeOutsideVisibleBounds: true });
        try { map.addLayer(clusterRef.current); } catch (e) { console.warn('addLayer failed', e); }
      } else {
        // When plugin not available, use a simple array holder and a dedicated LayerGroup
        clusterRef.current = L.layerGroup();
        try { map.addLayer(clusterRef.current); } catch (e) { console.warn('addLayer (layerGroup) failed', e); }
      }
    }

    // Clear existing markers
    try { clusterRef.current.clearLayers(); } catch (e) { /* ignore */ }

    // Add new markers (clustered when plugin available, or plain markers otherwise)
    try {
      for (const p of (poiMarkers || [])) {
        try {
          const marker = L.marker([p.lat, p.lon], { icon: createPoiIcon(p.name ? p.name[0] : '') });
          const container = document.createElement('div');
          container.style.fontFamily = 'sans-serif';
          const titleEl = document.createElement('div');
          titleEl.style.fontWeight = '700';
          titleEl.style.marginBottom = '4px';
          titleEl.textContent = p.name || p.type || 'POI';
          const typeEl = document.createElement('div');
          typeEl.style.fontSize = '12px';
          typeEl.style.color = '#666';
          typeEl.style.marginBottom = '6px';
          typeEl.textContent = p.type || '';
          const controls = document.createElement('div');
          controls.style.display = 'flex';
          controls.style.gap = '6px';

          const addBtn = document.createElement('button');
          addBtn.textContent = 'Add';
          addBtn.style.padding = '6px 8px';
          addBtn.style.background = '#4F46E5';
          addBtn.style.color = '#fff';
          addBtn.style.borderRadius = '4px';
          addBtn.style.border = '0';
          addBtn.style.cursor = 'pointer';
          addBtn.style.fontSize = '12px';

          const flyBtn = document.createElement('button');
          flyBtn.textContent = 'Fly';
          flyBtn.style.padding = '6px 8px';
          flyBtn.style.background = '#f3f4f6';
          flyBtn.style.color = '#111';
          flyBtn.style.borderRadius = '4px';
          flyBtn.style.border = '0';
          flyBtn.style.cursor = 'pointer';
          flyBtn.style.fontSize = '12px';

          controls.appendChild(addBtn);
          controls.appendChild(flyBtn);
          container.appendChild(titleEl);
          container.appendChild(typeEl);
          container.appendChild(controls);

          marker.bindPopup(container);
          marker.on('popupopen', () => {
            try {
              addBtn.onclick = () => {
                try {
                  if (typeof window.__TRIPCRAFT_MAP_ADD_ITEM__ === 'function') {
                    window.__TRIPCRAFT_MAP_ADD_ITEM__({ location: p.name || '', title: p.name || p.type, type: 'enroute', date: '' });
                  }
                } catch (e) { console.warn('Add button handler failed', e); }
              };
              flyBtn.onclick = () => {
                try {
                  const m = window.__TRIPCRAFT_MAP_INSTANCE__;
                  if (m && typeof m.setView === 'function') m.setView([p.lat, p.lon], 15);
                } catch (e) { console.warn('Fly button handler failed', e); }
              };
            } catch (e) { console.warn('popupopen handler failed', e); }
          });

          // Add to cluster or plain layerGroup
          try {
            clusterRef.current.addLayer ? clusterRef.current.addLayer(marker) : clusterRef.current.addLayer(marker);
          } catch (e) {
            try { map.addLayer(marker); } catch (err) { console.warn('Failed to add POI marker to map', err); }
          }
        } catch (e) { console.warn('Failed to add POI marker', e); }
      }
    } catch (e) { console.warn('Adding markers to cluster failed', e); }

    // Keep a global pointer to the map for popup button fly action
    try { window.__TRIPCRAFT_MAP_INSTANCE__ = map; } catch (e) {}

    return () => {
      try {
        if (clusterRef.current) {
          try { map.removeLayer(clusterRef.current); } catch (e) {}
          clusterRef.current = null;
        }
      } catch (e) { /* ignore */ }
    };
  }, [mapRef && mapRef.current, JSON.stringify(poiMarkers || []), selectedOverlays && selectedOverlays.tourism]);

  return null;
}
