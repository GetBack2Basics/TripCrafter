import React, { useEffect, useState, useCallback } from 'react';
import { BedDouble, Tent, Car, Info, Ship } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
    try {
      console.debug('Geocoding attempt:', q);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          console.debug('Geocoding success for', q, { lat, lng, display_name: data[0].display_name });
          return { lat, lng };
        }
      }
    } catch (err) {
      console.warn('Geocoding attempt failed for', q, err);
    }
  }
  console.debug('Geocoding: no results for any candidate for', location);
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
function createCustomIcon(number, type, isActive, scale = 1) {
  const size = 20 * scale;
  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: ${isActive ? '#f59e42' : type === 'roofed' || type === 'camp' ? '#2563eb' : type === 'enroute' ? '#f59e42' : '#4F46E5'};
      border: 2px solid ${isActive ? '#f59e42' : 'white'};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${12 * scale}px;
    ">
      ${number}
    </div>
  `;

  // Add an 'active' class when this marker is active so CSS can animate it
  const className = `custom-marker${isActive ? ' active' : ''}`;

  return L.divIcon({
    html,
    className,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
}

// Small on-screen debug overlay component
function DebugOverlay() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  useEffect(() => {
    // populate periodically from window helpers
    const id = setInterval(() => {
      try {
        if (typeof window !== 'undefined' && window.__TRIPCRAFT_DEBUG_LOG_MARKERS__) {
          const res = window.__TRIPCRAFT_DEBUG_LOG_MARKERS__();
          if (res && res.markers) setItems(res.markers);
        }
      } catch (e) {}
    }, 800);
    return () => clearInterval(id);
  }, []);

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
          {items.length === 0 && <div style={{ fontSize: 12, color: '#666' }}>No markers</div>}
          {items.map((m, i) => (
            <div key={`${m.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ flex: 1, fontSize: 12 }}>
                <div><strong>{m.id}</strong></div>
                <div style={{ color: '#666' }}>{Array.isArray(m.position) ? `${m.position[0].toFixed ? m.position[0].toFixed(4) : m.position[0]}, ${m.position[1].toFixed ? m.position[1].toFixed(4) : m.position[1]}` : String(m.position)}</div>
              </div>
              <div>
                <button onClick={() => { try { if (window.__TRIPCRAFT_DEBUG_ATTEMPT_FLY__) window.__TRIPCRAFT_DEBUG_ATTEMPT_FLY__(m.id); } catch (e) { console.warn(e); } }} style={{ padding: '4px 8px', fontSize: 12 }}>Fly</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
function TripMap({ tripItems, loadingInitialData, onUpdateTravelTime, autoUpdateTravelTimes = false, onSaveRouteTimes = null }) {
  const [markers, setMarkers] = useState([]);
  const [route, setRoute] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(7);
  const [previewRoute, setPreviewRoute] = useState(null);
  const [previewTimes, setPreviewTimes] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [accomNights, setAccomNights] = useState({});
  const [activeIndex, setActiveIndex] = useState(null);
  const [imageIndexes, setImageIndexes] = useState({});
  const [debugResult, setDebugResult] = useState(null);
    const [mapInstance, setMapInstance] = useState(null);
    const mapRef = React.useRef(null);
  // Queue for fly requests: each entry { id, lat, lng, resolve, reject }
  const flyRequestsRef = React.useRef([]);
  const flyRequestsVersion = React.useRef(0);
  const geocodeCacheRef = React.useRef({});
  const coordsByIndexRef = React.useRef({});
  const coordsByIdRef = React.useRef({});
  const ZOOM_INCLUDE_ENROUTE = 10; // zoom threshold to include 'enroute' points on the map

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
        <p className="text-xl mb-4">No mappable locations to display</p>
        <p>Add some trip items with locations to see them on the map!</p>
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

      for (let i = 0; i < sortedTripItems.length; i++) {
        const item = sortedTripItems[i];
        // Include all item types (do not skip notes)

        // Try cached geocode first
        let coords = geocodeCacheRef.current[item.location];
        if (!coords) {
          coords = await geocodeLocation(item.location);
          if (coords) geocodeCacheRef.current[item.location] = coords;
        }

  if (!coords) continue;

  coordsByIndex[i] = coords;
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
            icon: createCustomIcon(labelIndex, item.type, activeIndex === i, scale)
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
        console.log('Getting route for coordinates:', coordinates);
        const routeData = await getRoute(coordinates);
        console.log('Route data received:', routeData);
        if (routeData && routeData.geometry) {
          const routeCoords = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert to [lat, lng]
          console.log('Converted route coordinates:', routeCoords.slice(0, 5), '...');
          setRoute(routeCoords);

          if (autoUpdateTravelTimes && onUpdateTravelTime && routeData.legs) {
            routeData.legs.forEach((leg, idx) => {
              const duration = `${Math.round(leg.duration / 60)} mins`;
              const distance = `${(leg.distance / 1000).toFixed(1)} km`;
              const destinationIndexInVisible = idx + 1;
              if (destinationIndexInVisible < coordinates.length) {
                const coord = coordinates[destinationIndexInVisible];
                // find matching original index
                let matchedId = null;
                for (const k of Object.keys(coordsByIndex)) {
                  const c = coordsByIndex[k];
                  if (c && Number(c.lat) === Number(coord.lat) && Number(c.lng) === Number(coord.lng)) {
                    matchedId = sortedTripItems[Number(k)].id;
                    break;
                  }
                }
                if (matchedId) onUpdateTravelTime(matchedId, duration, distance, null);
              }
            });
          }
        } else {
          console.log('No route data received from OSRM');
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
  }, [sortedTripItems, isProcessing, onUpdateTravelTime, activeIndex, currentZoom]);

  useEffect(() => {
    processLocations();
  }, [processLocations]);

  // Update marker icons when activeIndex changes so the active marker gets the 'active' CSS class
  useEffect(() => {
    if (!markers || markers.length === 0) return;
    setMarkers(prev => prev.map(m => ({
      ...m,
      icon: createCustomIcon((typeof m.item.displayIndex === 'number' ? m.item.displayIndex : (m.index + 1)), m.item.type, activeIndex === m.index, 1)
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
          marker = { id: item?.id, position: [Number(cached.lat), Number(cached.lng)], item, index: targetIndex != null ? targetIndex : (item ? sortedTripItems.findIndex(it => it.id === item.id) : null), icon: createCustomIcon((targetIndex != null ? (targetIndex + 1) : 1), item?.type, false, 0.9) };
        } else if (typeof targetIndex === 'number' && sortedTripItems[targetIndex]) {
          // try on-demand geocode fallback using the item's location
          const coords = await geocodeLocation(sortedTripItems[targetIndex].location);
          if (coords) {
            const item = sortedTripItems[targetIndex];
            marker = { id: item.id, position: [Number(coords.lat), Number(coords.lng)], item, index: targetIndex, icon: createCustomIcon(targetIndex+1, item?.type, false, 0.9) };
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
              marker = { id: item.id, position: [Number(coords.lat), Number(coords.lng)], item, index: idx, icon: createCustomIcon(idx+1, item?.type, false, 0.9) };
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
        if (typeof window !== 'undefined' && window.__TRIPCRAFT_DEBUG_FLYTO__) {
          return window.__TRIPCRAFT_DEBUG_FLYTO__(identifier);
        }
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

  // Expose debug helpers on window so the DebugPanel can trigger map actions for testing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Expose attemptFly so external debug tools can reuse the same logic/waiting for the map instance
    window.__TRIPCRAFT_DEBUG_ATTEMPT_FLY__ = attemptFly;
    // Provide a simple compatibility helper that calls attemptFly
    window.__TRIPCRAFT_DEBUG_FLYTO__ = async (index = 0) => {
      try {
        if (typeof window !== 'undefined' && typeof window.__TRIPCRAFT_DEBUG_ATTEMPT_FLY__ === 'function') {
          return await window.__TRIPCRAFT_DEBUG_ATTEMPT_FLY__(index);
        }
        return { ok: false, error: 'no-attempt-fly' };
      } catch (err) {
        console.warn('DebugFly wrapper failed', err);
        return { ok: false, error: String(err) };
      }
    };

    window.__TRIPCRAFT_DEBUG_LOG_MARKERS__ = () => {
      try {
        const out = markers.map(m => ({ id: m.id, index: m.index, position: Array.isArray(m.position) ? m.position : (m.position && typeof m.position === 'object' ? [m.position.lat ?? m.position[0], m.position.lng ?? m.position[1]] : null) }));
        console.debug('DebugMarkers:', out);
        return { ok: true, markers: out };
      } catch (e) { console.warn('Debug log markers failed', e); return { ok: false, error: String(e) }; }
    };

    return () => {
      try { delete window.__TRIPCRAFT_DEBUG_FLYTO__; } catch (e) {}
      try { delete window.__TRIPCRAFT_DEBUG_ATTEMPT_FLY__; } catch (e) {}
      try { delete window.__TRIPCRAFT_DEBUG_LOG_MARKERS__; } catch (e) {}
    };
  }, [mapInstance, markers, currentZoom]);

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
                        {displayIndex}. {getPlaceName(item.location)}{idx < sortedTripItems.length-1 && <span className="text-gray-400"> 7 </span>}
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
            <button
              type="button"
              className={`px-3 py-1 rounded-md text-sm ${(!markers || markers.length < 2 || isProcessing) ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 text-white'}`}
              onClick={async () => {
                // Compute preview times using current markers
                if (!markers || markers.length < 2 || isProcessing) return;
                setIsProcessing(true);
                setIsPreviewing(false);
                setPreviewRoute(null);
                setPreviewTimes(null);
                try {
                  // Normalize coords: markers may have position as {lat,lng} or [lat, lng]
                  const coords = markers.map(m => {
                    const p = m.position;
                    if (Array.isArray(p) && p.length >= 2) return { lat: Number(p[0]), lng: Number(p[1]) };
                    if (p && typeof p === 'object') return { lat: Number(p.lat ?? p[0]), lng: Number(p.lng ?? p[1]) };
                    return null;
                  }).filter(Boolean);
                  const data = await getRoute(coords);
                  if (data) {
                    const routeCoords = data.geometry.coordinates.map(c => [c[1], c[0]]);
                    setPreviewRoute(routeCoords);
                    // Build per-destination preview times (legs)
                    const pt = {};
                    if (data.legs) {
                      data.legs.forEach((leg, idx) => {
                        const duration = `${Math.round(leg.duration / 60)} mins`;
                        const distance = `${(leg.distance / 1000).toFixed(1)} km`;
                        const destinationIndex = idx + 1;
                        if (destinationIndex < markers.length) {
                          const itemId = markers[destinationIndex].id;
                          pt[itemId] = { duration, distance };
                        }
                      });
                    }
                    setPreviewTimes(pt);
                    setIsPreviewing(true);
                  } else {
                    console.warn('Preview route computation returned no data');
                  }
                } catch (err) {
                  console.error('Preview computation failed', err);
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={!markers || markers.length < 2 || isProcessing}
              title={!markers || markers.length < 2 ? 'Need at least two mapped points to compute a route' : isProcessing ? 'Computing preview...' : 'Compute preview route and times'}
            >
              Compute Preview
            </button>

            {isPreviewing && (
              <>
                <button
                  type="button"
                  className="px-3 py-1 bg-green-600 text-white rounded-md text-sm"
                  onClick={() => {
                    if (!previewTimes) return;
                    const batch = Object.entries(previewTimes).map(([itemId, vals]) => ({ id: itemId, duration: vals.duration, distance: vals.distance }));
                    // If parent provided onSaveRouteTimes, call it once with the batch
                    if (onSaveRouteTimes) {
                      try {
                        onSaveRouteTimes(batch);
                      } catch (err) {
                        console.error('onSaveRouteTimes failed:', err);
                        // fallback to per-item updates
                        if (onUpdateTravelTime) {
                          batch.forEach(b => onUpdateTravelTime(b.id, b.duration, b.distance, null));
                        }
                      }
                    } else if (onUpdateTravelTime) {
                      // fallback: call per-item updates
                      batch.forEach(b => onUpdateTravelTime(b.id, b.duration, b.distance, null));
                    }
                    // apply preview route as the active route
                    if (previewRoute) setRoute(previewRoute);
                    setPreviewRoute(null);
                    setPreviewTimes(null);
                    setIsPreviewing(false);
                  }}
                >
                  Save Route Times
                </button>

                <button
                  type="button"
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm"
                  onClick={() => {
                    // Discard preview
                    setPreviewRoute(null);
                    setPreviewTimes(null);
                    setIsPreviewing(false);
                  }}
                >
                  Discard Preview
                </button>
              </>
            )}
            {/* map-local debug controls removed (use DebugPanel in TripDashboard instead) */}
          </div>
          <MapContainer
            center={center}
            zoom={currentZoom}
            style={{ height: '500px', width: '100%', cursor: 'grab' }}
            whenCreated={(map) => {
              setCurrentZoom(7);
              setMapInstance(map);
              mapRef.current = map;
              try {
                if (map.scrollWheelZoom && typeof map.scrollWheelZoom.enable === 'function') map.scrollWheelZoom.enable();
                if (map.options) map.options.scrollWheelZoom = true;
              } catch (e) { /* ignore */ }

              // Attach a wheel fallback directly to the Leaflet container. This avoids
              // introducing extra DOM layers that can intercept pointer events.
              try {
                const container = map.getContainer && map.getContainer();
                if (container && !container.__tripcraft_wheel_attached) {
                  let wheelCooldown = false;
                  const WHEEL_DEBUG = false; // set true temporarily to log wheel events
                  const handler = (e) => {
                    try {
                      if (WHEEL_DEBUG) console.debug('map wheel event', { deltaY: e.deltaY, target: e.target && e.target.tagName });
                      if (e.ctrlKey || e.metaKey) return; // user intent: page zoom
                      // If Leaflet already handles wheel events, do nothing. We detect
                      // this by checking map.options.scrollWheelZoom (should be true)
                      // and relying on Leaflet to perform the zoom. If wheel events are
                      // not resulting in zoom changes, this handler will still be a safe fallback.
                      if (wheelCooldown) return;
                      wheelCooldown = true;
                      setTimeout(() => { wheelCooldown = false; }, 80);

                      if (e.deltaY > 0) {
                        if (typeof map.zoomOut === 'function') map.zoomOut();
                      } else if (e.deltaY < 0) {
                        if (typeof map.zoomIn === 'function') map.zoomIn();
                      }
                    } catch (err) { /* swallow */ }
                  };
                  // Use capture so we receive the wheel event before any child targets
                  container.addEventListener('wheel', handler, { passive: false, capture: true });
                  container.__tripcraft_wheel_attached = { handler };
                  // Window-level fallback: if wheel events don't reach the container (due to overlays),
                  // handle them at the capture phase on the window and check if they occurred
                  // within the container's bounding rect.
                  const windowHandler = (we) => {
                    try {
                      if (we.ctrlKey || we.metaKey) return;
                      if (WHEEL_DEBUG) console.debug('window wheel', { deltaY: we.deltaY, target: we.target && we.target.tagName });
                      const rect = container.getBoundingClientRect();
                      const x = (we.clientX || 0);
                      const y = (we.clientY || 0);
                      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                        // inside map bounds
                        we.preventDefault();
                        // respect cooldown
                        if (wheelCooldown) return;
                        wheelCooldown = true;
                        setTimeout(() => { wheelCooldown = false; }, 80);
                        if (we.deltaY > 0) {
                          if (typeof map.zoomOut === 'function') map.zoomOut();
                        } else if (we.deltaY < 0) {
                          if (typeof map.zoomIn === 'function') map.zoomIn();
                        }
                      }
                    } catch (err) { /* swallow */ }
                  };
                  window.addEventListener('wheel', windowHandler, { passive: false, capture: true });
                  container.__tripcraft_wheel_attached.windowHandler = windowHandler;
                }
              } catch (err) {
                // non-fatal
                console.warn('Failed to attach wheel fallback handler', err);
              }
            }}
            onZoomEnd={(e) => setCurrentZoom(e.target.getZoom())}
            dragging={true}
            doubleClickZoom={true}
            touchZoom={true}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {markers.map((marker) => (
              <Marker
                key={marker.id}
                position={marker.position}
                icon={marker.icon}
                eventHandlers={{
                  click: async () => {
                    // Try to fly to this marker; fallback to debug helper if necessary
                    try {
                      await attemptFly(marker.id);
                    } catch (e) {
                      console.warn('Marker click attemptFly error', e);
                      setActiveIndex(marker.index);
                    }
                  }
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'sans-serif' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#4F46E5' }}>
                      {marker.item.location}
                    </h3>
                    <p style={{ margin: 0, color: '#666' }}>
                      <strong>Date:</strong> {marker.item.date}
                    </p>
                    <p style={{ margin: 0, color: '#666' }}>
                      <strong>Stay:</strong> {marker.item.accommodation || ''}
                    </p>
                    {(marker.item.type === 'roofed' || marker.item.type === 'camp') && (
                      <p style={{ margin: 0, color: '#2563eb' }}>
                        <strong>Nights:</strong> {accomNights[marker.item.location]}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {route && (
              <Polyline
                positions={route}
                color="#4F46E5"
                weight={4}
                opacity={0.8}
              />
            )}
            {isPreviewing && previewRoute && (
              <Polyline
                positions={previewRoute}
                color="#10B981" // teal/green
                weight={3}
                opacity={0.9}
                dashArray="8,6"
              />
            )}
            {route && console.log('Rendering route with positions:', route.slice(0, 3), '...')}
            <MapController markers={markers} flyRequestsRef={flyRequestsRef} flyRequestsVersion={flyRequestsVersion} zoomThreshold={ZOOM_INCLUDE_ENROUTE} />
              {/* Debug overlay: toggled panel listing items and markers for QA */}
              <DebugOverlay />
            {/* On-map pan/zoom controls */}
            <div className="absolute top-3 right-3 z-50" style={{ pointerEvents: 'none' }}>
              <div className="bg-white bg-opacity-90 rounded-md shadow p-1" style={{ width: 44, pointerEvents: 'auto' }}>
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    title="Zoom in"
                    className="w-9 h-9 flex items-center justify-center text-sm bg-white rounded mb-1 border"
                    onClick={() => { try { if (mapRef.current) mapRef.current.zoomIn(); } catch (e) { console.warn('zoomIn failed', e); } }}
                  >+
                  </button>
                  <button
                    type="button"
                    title="Zoom out"
                    className="w-9 h-9 flex items-center justify-center text-sm bg-white rounded mb-1 border"
                    onClick={() => { try { if (mapRef.current) mapRef.current.zoomOut(); } catch (e) { console.warn('zoomOut failed', e); } }}
                  >−
                  </button>
                  <div className="flex flex-col items-center mt-1">
                    <button
                      type="button"
                      title="Pan up"
                      className="w-9 h-8 flex items-center justify-center text-sm bg-white rounded mb-1 border"
                      onClick={() => { try { if (mapRef.current) mapRef.current.panBy([0, -120]); } catch (e) { console.warn('pan up failed', e); } }}
                    >↑</button>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Pan left"
                        className="w-9 h-8 flex items-center justify-center text-sm bg-white rounded border"
                        onClick={() => { try { if (mapRef.current) mapRef.current.panBy([-120, 0]); } catch (e) { console.warn('pan left failed', e); } }}
                      >←</button>
                      <button
                        type="button"
                        title="Pan right"
                        className="w-9 h-8 flex items-center justify-center text-sm bg-white rounded border"
                        onClick={() => { try { if (mapRef.current) mapRef.current.panBy([120, 0]); } catch (e) { console.warn('pan right failed', e); } }}
                      >→</button>
                    </div>
                    <button
                      type="button"
                      title="Pan down"
                      className="w-9 h-8 flex items-center justify-center text-sm bg-white rounded mt-1 border"
                      onClick={() => { try { if (mapRef.current) mapRef.current.panBy([0, 120]); } catch (e) { console.warn('pan down failed', e); } }}
                    >↓</button>
                  </div>
                </div>
              </div>
            </div>
          </MapContainer>

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
            const images = Array.isArray(item.discoverImages) ? item.discoverImages : [getLocalDiscoverImage(item.location)];
            const showPrev = images.length > 1;
            const showNext = images.length > 1;
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
                <span className="mb-1 relative block w-10 h-10 rounded-full overflow-hidden bg-gray-100" style={{marginBottom: 4}}>
                  {/* Cycling discover images */}
                  <img
                    src={images[imgIdx]}
                    alt={getPlaceName(item.location)}
                    className="object-cover w-full h-full"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    {getTypeIcon(item.type, item)}
                  </span>
                  <button
                    type="button"
                    className="absolute -top-2 -left-2 bg-indigo-600 text-white text-[10px] font-semibold rounded-full w-6 h-6 flex items-center justify-center"
                    title={`Fly to ${getPlaceName(item.location)}`}
                    aria-label={`Fly to ${getPlaceName(item.location)}`}
                    onClick={(e) => { e.stopPropagation(); try { attemptFly(item.id); } catch (err) { console.warn('badge fly failed', err); } }}
                  >
                    {displayIndex}
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
