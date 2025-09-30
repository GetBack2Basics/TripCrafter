import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';

// Dynamic loader: fetches /openpoimap-lite.js, wraps it to expose a small API,
// mounts the HTML fragment from the lite demo into a container, and calls
// exported API to add markers based on tripItems.
export default function OpenPoiMapDynamicLoader({ tripItems = [], currentTripId, onOpenEdit, setFlyHandler }) {
  const containerRef = useRef(null);
  const scriptRef = useRef(null);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    // ensure global L exists for the legacy script
    try { window.L = L; } catch (e) {}

    const container = containerRef.current;
    if (!container) return;

    // if a previous dynamic instance exists, try to destroy it first to avoid duplicate Leaflet inits
    try {
      if (window.__OPENPOIMAP_EXPORTS__ && typeof window.__OPENPOIMAP_EXPORTS__.destroy === 'function') {
        try { window.__OPENPOIMAP_EXPORTS__.destroy(); } catch (e) {}
      }
      // remove any previously injected script we created and revoke its blob URL
      const prev = document.getElementById('openpoimap-dynamic-script');
      if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
      try { if (window.__OPENPOIMAP_BLOB_URL__) { URL.revokeObjectURL(window.__OPENPOIMAP_BLOB_URL__); window.__OPENPOIMAP_BLOB_URL__ = undefined; } } catch (e) {}
    } catch (e) {}

    // create the inner HTML fragment (from public/openpoimap-lite.html's #app)
    container.innerHTML = `
      <div id="topbar">
        <div id="logo">OpenPoiMap <small>lite</small></div>
        <div id="categoryBar">
          <button data-cat="amenity">Amenity</button>
          <button data-cat="hotels">Hotels</button>
          <button data-cat="restaurants">Restaurants</button>
          <button data-cat="tourism">Tourism</button>
          <button id="clearAll">clear all</button>
        </div>
      </div>
      <div id="mapWrap">
        <div id="zoomControl" class="control">
          <button id="zoomIn">+</button>
          <div id="zoomSlider"><div id="zoomThumb"></div></div>
          <button id="zoomOut">−</button>
        </div>
        <div id="map" style="width:100%;height:100%;min-height:420px"></div>
        <div id="rightPanel" class="control">
          <div class="panelInner">
            <div class="panelTitle">Base Layer</div>
            <label><input type="radio" name="base" value="osm" checked /> Mapnik</label>
            <label><input type="radio" name="base" value="topo" /> Topo</label>
            <label><input type="radio" name="base" value="carto" /> Positron</label>
            <hr />
            <div class="panelTitle">Overlays</div>
            <div class="overlayList"></div>
            <hr />
            <div class="panelTitle" style="display:flex;justify-content:space-between;align-items:center;">
              <span>Actions</span>
              <button class="collapseBtn" data-target="actionsPanel" aria-expanded="true" style="font-size:14px;padding:2px 6px">−</button>
            </div>
            <div id="actionsPanel">
              <button id="fetchPois">Fetch POIs (demo)</button>
              <button id="resetView">Reset view</button>
            </div>
            <hr />
            <div class="panelTitle" style="display:flex;justify-content:space-between;align-items:center;">
              <span>Route Planner</span>
              <button class="collapseBtn" data-target="routePanel" aria-expanded="true" style="font-size:14px;padding:2px 6px">−</button>
            </div>
            <div id="routePanel">
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                <input id="locInput" type="text" placeholder="Address or place" style="flex:1;padding:6px;font-size:13px;" />
                <button id="addLocation">Add</button>
              </div>
              <div style="display:flex;gap:6px;margin-bottom:6px;">
                <button id="computeRoute">Compute Route</button>
                <button id="clearRoute">Clear Route</button>
                <button id="mapAddToggle">Map add: off</button>
                <button id="loadSample">Load Sample Trip</button>
              </div>
              <div style="display:flex;gap:6px;margin-top:6px;">
                <button id="clearGeocodeCacheBtn" style="background:#f3f4f6;padding:6px;border-radius:6px">Clear geocode cache</button>
              </div>
              <div id="routeList" style="max-height:160px;overflow:auto;font-size:13px;border:1px solid #eee;padding:6px;background:#fff"></div>
              <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
                <div id="routeProgress" style="display:none;align-items:center"><div class="oc-spinner" style="margin-right:8px"></div><div id="routeProgressText">Preparing...</div></div>
                <div id="loaderStatus" style="flex:1;max-height:140px;overflow:auto;font-size:12px;background:#111;color:#eee;padding:6px;border-radius:4px;">Status logs will appear here.</div>
              </div>
            </div>
          </div>
        </div>
        <div id="poiStatus" class="control">POIs: <span id="poiCount">0</span></div>
        <a id="permalink" class="control" href="#">Permalink</a>
      </div>
    `;

    let mounted = true;

    // fetch and wrap the legacy script to export a small API
    (async () => {
      try {
        const resp = await fetch('/openpoimap-lite.js');
        let text = await resp.text();

        // Wrap: replace leading (function(){ with (function(exports){ and replace trailing })();
        text = text.replace(/^\(function\(\)\{/, '(function(exports){');
        // remove trailing immediately-invoked ending if present
        text = text.replace(/\}\)\(\);?\s*$/, '');

        // before the legacy code runs, prepend a small pre-cleanup that will attempt
        // to call any previously-registered destroy hook and clear any leftover
        // Leaflet container marker properties on #map to prevent double-init.
        const preamble = `
try{
  try{ if (window.__OPENPOIMAP_LAST_DESTROY__ && typeof window.__OPENPOIMAP_LAST_DESTROY__ === 'function') { try{ window.__OPENPOIMAP_LAST_DESTROY__(); }catch(e){} window.__OPENPOIMAP_LAST_DESTROY__ = undefined; } }catch(e){}
  try{ if (window.__OPENPOIMAP_EXPORTS__ && typeof window.__OPENPOIMAP_EXPORTS__.destroy === 'function') { try{ window.__OPENPOIMAP_EXPORTS__.destroy(); }catch(e){} } }catch(e){}
  try{
    var _m = document.getElementById('map');
    if(_m){ try{ if('_leaflet_id' in _m) { try{ delete _m._leaflet_id; }catch(e){} } }catch(e){} }
  }catch(e){}
}catch(e){}
`;

        // append an exporter that exposes a small API onto exports
        const exportWrapper = `
try{
  exports.flyTo = function(lat,lng,zoom){ try{ if(typeof map!=='undefined' && map) map.flyTo([Number(lat),Number(lng)], zoom||map.getZoom(), { duration: 0.6 }); }catch(e){} };
  exports.addPoi = function(lat,lng,name,cat){ try{ if(typeof addPoi==='function') addPoi(Number(lat),Number(lng),name,cat); }catch(e){} };
  exports.reset = function(){ try{ if(typeof map!=='undefined' && map) map.setView([44.402,10.424],10); }catch(e){} };
  exports.destroy = function(){ try{ if(typeof map!=='undefined' && map){ try{ map.remove(); }catch(e){} } }catch(e){} };
  // fallback addPolyline: if the legacy script doesn't implement addPolyline, provide a simple Leaflet-based drawer
  if (typeof exports.addPolyline !== 'function') {
    exports._polylines = exports._polylines || [];
    exports.addPolyline = function(points, style) {
      try{
        if (typeof map !== 'undefined' && map && Array.isArray(points)) {
          const latlngs = points.map(p => L.latLng(Number(p[0]), Number(p[1])));
          const pl = L.polyline(latlngs, style || { color: '#4F46E5', weight: 4, opacity: 0.8 }).addTo(map);
          exports._polylines.push(pl);
        } else {
          // store for later when map is available
          exports._pendingPolylines = exports._pendingPolylines || [];
          exports._pendingPolylines.push({ points: points, style: style });
        }
      }catch(e){}
    };
    // if map becomes available later, flush pending
    (function flushPending(){
      try{ if (typeof map !== 'undefined' && map && exports._pendingPolylines && exports._pendingPolylines.length) {
        for (const p of exports._pendingPolylines) {
          try{ exports.addPolyline(p.points, p.style); } catch(e){}
        }
        exports._pendingPolylines = [];
      } }catch(e){}
    })();
  }
}catch(e){}
})(window.__OPENPOIMAP_EXPORTS__ = window.__OPENPOIMAP_EXPORTS__ || {});
`;

        // Inject the preamble immediately after the iife opening so it runs before the legacy body
        // Find the opening token '(function(exports){' and insert preamble after it.
        let finalBody = text;
        const openToken = '(function(exports){';
        const idx = finalBody.indexOf(openToken);
        if (idx !== -1) {
          finalBody = finalBody.slice(0, idx + openToken.length) + '\n' + preamble + '\n' + finalBody.slice(idx + openToken.length);
        } else {
          // fallback: prepend preamble
          finalBody = preamble + '\n' + finalBody;
        }
        const finalScript = finalBody + '\n' + exportWrapper;

        const blob = new Blob([finalScript], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
          // insert a try/catch that wraps the legacy init so we capture any exceptions during map creation
          // we inject 'try{' after the '(function(exports){' token and close with catch before the export wrapper
          if (finalBody.indexOf(openToken) !== -1) {
            finalBody = finalBody.replace(openToken, openToken + '\ntry{');
            finalBody = finalBody + '\n}catch(e){ try{ console.error("[openpoimap-wrapper] legacy init error", e); window.__OPENPOIMAP_INIT_ERROR__ = (e && e.stack) ? String(e.stack) : String(e); }catch(e){} }';
          } else {
            // fallback: wrap entire body
            finalBody = 'try{\n' + finalBody + '\n}catch(e){ try{ console.error("[openpoimap-wrapper] legacy init error", e); window.__OPENPOIMAP_INIT_ERROR__ = (e && e.stack) ? String(e.stack) : String(e); }catch(e){} }';
          }

  const s = document.createElement('script');
  s.id = 'openpoimap-dynamic-script';
        s.src = url;
        s.async = true;
        scriptRef.current = s;
  document.body.appendChild(s);
  // track the blob URL globally so future mounts can revoke it if needed
  try { window.__OPENPOIMAP_BLOB_URL__ = url; } catch (e) {}

        s.onload = () => {
          try {
            console.debug('[openpoimap-adapter] script loaded, exports=', window.__OPENPOIMAP_EXPORTS__);
            // after loading, wait briefly and report whether the legacy map object exists
            setTimeout(() => {
              try {
                const hasMap = (typeof window.map !== 'undefined');
                const hasExports = !!(window.__OPENPOIMAP_EXPORTS__);
                console.debug('[openpoimap-adapter] post-load check hasMap=', hasMap, 'hasExports=', hasExports, 'exportsKeys=', hasExports ? Object.keys(window.__OPENPOIMAP_EXPORTS__) : []);
                // expose small status object for debugging in the page
                try { window.__OPENPOIMAP_LOADER_STATUS__ = window.__OPENPOIMAP_LOADER_STATUS__ || {}; window.__OPENPOIMAP_LOADER_STATUS__.hasMap = hasMap; window.__OPENPOIMAP_LOADER_STATUS__.hasExports = hasExports; } catch (e) {}
                if (!hasMap) console.warn('[openpoimap-adapter] legacy script did not create global `map` — the map container may not have been initialized');
              } catch (e) {}
            }, 1200);
            // expose fly handler
            if (window.__OPENPOIMAP_EXPORTS__ && typeof window.__OPENPOIMAP_EXPORTS__.flyTo === 'function') {
              setFlyHandler && setFlyHandler(window.__OPENPOIMAP_EXPORTS__.flyTo);
            }
              // populate markers / routes from tripItems
            if (Array.isArray(tripItems) && window.__OPENPOIMAP_EXPORTS__) {
              let added = 0;
              for (const it of tripItems) {
                try {
                  // accept multiple shapes: lat/lng, latitude/longitude, coords {lat,lng}, or a location string
                  let lat = null, lng = null;
                  if (it == null) continue;
                  if (typeof it.lat !== 'undefined' && typeof it.lng !== 'undefined') { lat = it.lat; lng = it.lng; }
                  else if (typeof it.latitude !== 'undefined' && typeof it.longitude !== 'undefined') { lat = it.latitude; lng = it.longitude; }
                  else if (it.coords && (typeof it.coords.lat !== 'undefined' || typeof it.coords.latitude !== 'undefined')) {
                    lat = it.coords.lat || it.coords.latitude; lng = it.coords.lng || it.coords.longitude;
                  }
                    else if (typeof it.location === 'string' && /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(it.location)) {
                      // location string like "-42.88,147.33"
                      const parts = it.location.split(',').map(s => s.trim()); lat = Number(parts[0]); lng = Number(parts[1]);
                    }
                    else if (it.geometry && Array.isArray(it.geometry.coordinates)) {
                      // GeoJSON geometry, coordinates in [lng,lat] or [lon, lat]
                      const c = it.geometry.coordinates;
                      if (c.length >= 2) { lng = Number(c[0]); lat = Number(c[1]); }
                    }
                    else if (it.position && Array.isArray(it.position)) {
                      lat = Number(it.position[0]); lng = Number(it.position[1]);
                    }
                    else if (it.geo && Array.isArray(it.geo.coordinates)) {
                      const c = it.geo.coordinates; if (c.length >= 2) { lng = Number(c[0]); lat = Number(c[1]); }
                    }
                  // If the item encodes a route (array of coords), instruct the legacy map to draw a polyline if supported
                  if (!lat && Array.isArray(it.route) && it.route.length > 0 && typeof window.__OPENPOIMAP_EXPORTS__.addPolyline === 'function') {
                    try {
                      const pts = it.route.map(p => [Number(p.lat || p.latitude), Number(p.lng || p.longitude) || Number(p.lon || p.longitude)]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
                      if (pts.length > 1) { window.__OPENPOIMAP_EXPORTS__.addPolyline(pts, it.style || {}); added++; }
                    } catch (e) {}
                    continue;
                  }
                  if (!lat || !lng) continue;
                  try {
                    window.__OPENPOIMAP_EXPORTS__.addPoi(Number(lat), Number(lng), it.title || it.location || it.name || '', it.type || 'waypoint');
                    added++;
                  } catch (e) { console.warn('[openpoimap-adapter] addPoi failed for item', it, e); }
                } catch (e) { /* ignore individual item errors */ }
              }
              // update poi count if available
              try { const c = document.getElementById('poiCount'); if (c) c.textContent = String(added); } catch (e) {}
            }
          } catch (e) { console.warn('openpoimap adapter onload failed', e); }
        };
      } catch (e) {
        console.warn('Failed to load openpoimap-lite.js', e);
      }
    })();

    return () => {
      mounted = false;
  // call destroy if available
  try {
    if (window.__OPENPOIMAP_EXPORTS__ && typeof window.__OPENPOIMAP_EXPORTS__.destroy === 'function') {
      try { console.debug('[openpoimap-adapter] calling exports.destroy() on unmount'); window.__OPENPOIMAP_EXPORTS__.destroy(); } catch (e) { console.warn('[openpoimap-adapter] destroy() threw', e); }
      // keep a reference to the last destroyfn so the wrapper preamble can call it safely on next mount
      try { window.__OPENPOIMAP_LAST_DESTROY__ = window.__OPENPOIMAP_EXPORTS__.destroy; window.__OPENPOIMAP_LAST_DESTROY_TS__ = Date.now(); } catch (e) {}
    }
  } catch (e) {}
  // cleanup script and blob
  try { if (scriptRef.current && scriptRef.current.parentNode) scriptRef.current.parentNode.removeChild(scriptRef.current); } catch (e) {}
  try { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); } catch (e) {}
  try { window.__OPENPOIMAP_EXPORTS__ = undefined; delete window.__OPENPOIMAP_EXPORTS__; } catch (e) {}
  try { container.innerHTML = ''; } catch (e) {}
    };
  }, []);

  // update markers when tripItems change (if script already loaded)
  useEffect(() => {
    if (window.__OPENPOIMAP_EXPORTS__ && (typeof window.__OPENPOIMAP_EXPORTS__.addPoi === 'function' || typeof window.__OPENPOIMAP_EXPORTS__.addPolyline === 'function')) {
      try {
        let added = 0;
        for (const it of tripItems) {
          try {
            let lat = null, lng = null;
            if (it == null) continue;
            if (typeof it.lat !== 'undefined' && typeof it.lng !== 'undefined') { lat = it.lat; lng = it.lng; }
            else if (typeof it.latitude !== 'undefined' && typeof it.longitude !== 'undefined') { lat = it.latitude; lng = it.longitude; }
            else if (it.coords && (typeof it.coords.lat !== 'undefined' || typeof it.coords.latitude !== 'undefined')) {
              lat = it.coords.lat || it.coords.latitude; lng = it.coords.lng || it.coords.longitude;
            }
            if (!lat || !lng) {
              // route handling
              if (Array.isArray(it.route) && it.route.length > 0 && typeof window.__OPENPOIMAP_EXPORTS__.addPolyline === 'function') {
                try {
                  const pts = it.route.map(p => [Number(p.lat || p.latitude), Number(p.lng || p.longitude) || Number(p.lon || p.longitude)]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
                  if (pts.length > 1) { window.__OPENPOIMAP_EXPORTS__.addPolyline(pts, it.style || {}); added++; }
                } catch (e) {}
              }
              continue;
            }
            try {
              window.__OPENPOIMAP_EXPORTS__.addPoi(Number(lat), Number(lng), it.title || it.location || it.name || '', it.type || 'waypoint');
              added++;
            } catch (e) { console.warn('[openpoimap-adapter] addPoi failed during update for item', it, e); }
          } catch (e) { /* ignore item errors */ }
        }
        try { const c = document.getElementById('poiCount'); if (c) c.textContent = String(added); } catch (e) {}
      } catch (e) { /* ignore */ }
    }
  }, [tripItems]);

  return (
    <div style={{ width: '100%', height: '500px', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
