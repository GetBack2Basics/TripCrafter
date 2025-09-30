import React, { useEffect } from 'react';

// Simple dynamic loader to mount legacy openpoimap-lite.js into the placeholder
// Expects a container element with id `openpoimap-container` to exist in the DOM.
export default function OpenPoiMapLoader() {
  useEffect(() => {
    let scriptEl = null;
    let blobUrl = null;
    let didMount = true;

  const container = document.getElementById('openpoimap-container');
    if (!container) return () => {};

    // Strong cleanup before injecting UI: call any previous destroy, remove prior leaflet containers and scripts
    try {
      if (window.__OPENPOIMAP_EXPORTS__ && typeof window.__OPENPOIMAP_EXPORTS__.destroy === 'function') {
        try { window.__OPENPOIMAP_EXPORTS__.destroy(); } catch (e) {}
      }
    } catch (e) {}
    try {
      // remove previously injected scripts
      Array.from(document.querySelectorAll('script[data-openpoimap="true"]')).forEach(s => {
        try { s.parentNode && s.parentNode.removeChild(s); } catch (e) {}
      });
    } catch (e) {}
    try {
      // remove any leaflet container elements inside the container
      const leafEls = container.querySelectorAll('.leaflet-container, .leaflet-pane');
      leafEls.forEach(el => { try { el.parentNode && el.parentNode.removeChild(el); } catch (e) {} });
    } catch (e) {}
    try { delete window.__OPENPOIMAP_EXPORTS__; } catch (e) {}

    // Inject a slimmer right-side layout matching the demo: Base Layer radios + Overlays container
    // Include zoom/reset controls the legacy script expects (#zoomIn, #zoomOut, #resetView)
    container.innerHTML = `
      <div id="topbar" style="display:flex;align-items:center;gap:12px;padding:8px 12px;">
        <div id="logo">OpenPoiMap <small>lite</small></div>
      </div>
      <div id="mapWrap" style="position:relative;min-height:420px;">
        <div id="map" style="width:100%;height:100%;min-height:420px"></div>

        <!-- Zoom controls expected by the script -->
        <div id="zoomControls" style="position:absolute;left:12px;top:12px;z-index:800;display:flex;flex-direction:column;gap:6px;">
          <button id="zoomIn" title="Zoom in" style="width:36px;height:36px;border-radius:6px">+</button>
          <button id="zoomOut" title="Zoom out" style="width:36px;height:36px;border-radius:6px">−</button>
          <button id="resetView" title="Reset view" style="width:80px;height:28px;border-radius:6px">Reset</button>
        </div>

        <div id="rightPanel" style="position:absolute;right:12px;top:12px;z-index:700;min-width:220px;">
          <div style="background:rgba(255,255,255,0.95);padding:10px;border-radius:8px;margin-bottom:8px;box-shadow:0 6px 18px rgba(0,0,0,0.08)">
            <div style="font-weight:700;margin-bottom:6px">Base Layer</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <label><input type="radio" name="base" value="osm" checked /> <span style="margin-left:6px">Mapnik (OSM)</span></label>
              <label><input type="radio" name="base" value="topo" /> <span style="margin-left:6px">Topo</span></label>
              <label><input type="radio" name="base" value="carto" /> <span style="margin-left:6px">Positron</span></label>
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.95);padding:10px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.08)">
            <div style="font-weight:700;margin-bottom:6px">Overlays</div>
            <div class="overlayList" style="max-height:240px;overflow:auto">
              <!-- Pre-populated overlay groups (matches legacy groupMap) -->
              <div style="font-size:13px; font-weight:700; margin-bottom:6px">Amenity</div>
              <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">
                <label><input type="checkbox" data-cat="atm" /> atm</label>
                <label><input type="checkbox" data-cat="bank" /> bank</label>
                <label><input type="checkbox" data-cat="bench" /> bench</label>
                <label><input type="checkbox" data-cat="bicycle_parking" /> bicycle parking</label>
                <label><input type="checkbox" data-cat="bicycle_rental" /> bicycle rental</label>
                <label><input type="checkbox" data-cat="cinema" /> cinema</label>
                <label><input type="checkbox" data-cat="clinic" /> clinic</label>
                <label><input type="checkbox" data-cat="embassy" /> embassy</label>
                <label><input type="checkbox" data-cat="fire_station" /> fire station</label>
                <label><input type="checkbox" data-cat="fuel" /> fuel</label>
              </div>
              <div style="font-size:13px; font-weight:700; margin-bottom:6px">Tourism</div>
              <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">
                <label><input type="checkbox" data-cat="arts_centre" /> arts centre</label>
                <label><input type="checkbox" data-cat="statue" /> statue</label>
                <label><input type="checkbox" data-cat="castle" /> castle</label>
                <label><input type="checkbox" data-cat="vineyard" /> vineyard</label>
                <label><input type="checkbox" data-cat="museum" /> museum</label>
                <label><input type="checkbox" data-cat="viewpoint" /> viewpoint</label>
                <label><input type="checkbox" data-cat="attraction" /> attraction</label>
              </div>
              <div style="font-size:13px; font-weight:700; margin-bottom:6px">Hotels</div>
              <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">
                <label><input type="checkbox" data-cat="hotel" /> hotel</label>
                <label><input type="checkbox" data-cat="hostel" /> hostel</label>
                <label><input type="checkbox" data-cat="guest_house" /> guest house</label>
                <label><input type="checkbox" data-cat="apartment" /> apartment</label>
                <label><input type="checkbox" data-cat="camp_site" /> camp site</label>
              </div>
              <div style="font-size:13px; font-weight:700; margin-bottom:6px">Sport</div>
              <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">
                <label><input type="checkbox" data-cat="golf_course" /> golf course</label>
                <label><input type="checkbox" data-cat="ice_rink" /> ice rink</label>
                <label><input type="checkbox" data-cat="sports_centre" /> sports centre</label>
                <label><input type="checkbox" data-cat="soccer" /> soccer</label>
                <label><input type="checkbox" data-cat="tennis" /> tennis</label>
              </div>
              <div style="font-size:13px; font-weight:700; margin-bottom:6px">Shop</div>
              <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">
                <label><input type="checkbox" data-cat="marketplace" /> marketplace</label>
                <label><input type="checkbox" data-cat="clothes" /> clothes</label>
                <label><input type="checkbox" data-cat="mall" /> mall</label>
                <label><input type="checkbox" data-cat="chemist" /> chemist</label>
              </div>
              <div style="font-size:13px; font-weight:700; margin-bottom:6px">Food</div>
              <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">
                <label><input type="checkbox" data-cat="bakery" /> bakery</label>
                <label><input type="checkbox" data-cat="coffee" /> coffee</label>
                <label><input type="checkbox" data-cat="supermarket" /> supermarket</label>
                <label><input type="checkbox" data-cat="wine" /> wine</label>
              </div>
              <div style="font-size:13px; font-weight:700; margin-bottom:6px">Restaurants</div>
              <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">
                <label><input type="checkbox" data-cat="bar" /> bar</label>
                <label><input type="checkbox" data-cat="cafe" /> cafe</label>
                <label><input type="checkbox" data-cat="fast_food" /> fast food</label>
                <label><input type="checkbox" data-cat="restaurant" /> restaurant</label>
              </div>
              <div style="font-size:13px; font-weight:700; margin-bottom:6px">Various</div>
              <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">
                <label><input type="checkbox" data-cat="charging_station" /> charging station</label>
                <label><input type="checkbox" data-cat="recycling" /> recycling</label>
                <label><input type="checkbox" data-cat="bicycle" /> bicycle</label>
                <label><input type="checkbox" data-cat="bus_stop" /> bus stop</label>
              </div>
            </div>

            <!-- Visible POI Status + Actions (small, like the demo) -->
            <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;font-family:Arial,Helvetica,sans-serif;">
              <div style="background:#fff;border-radius:8px;padding:8px;box-shadow:0 6px 18px rgba(0,0,0,0.06);font-size:13px;color:#111;">
                <div style="font-weight:700;margin-bottom:6px">POI Status</div>
                <div style="font-size:13px;color:#333">Count: <span id="poiCount">0</span></div>
                <div style="font-size:12px;color:#666;margin-top:4px">Last: <span id="poiStatus"></span></div>
                <div id="loaderStatus" style="display:none"></div>
              </div>

              <div style="background:#fff;border-radius:8px;padding:8px;box-shadow:0 6px 18px rgba(0,0,0,0.06);display:flex;align-items:center;gap:8px;">
                <div style="flex:1">
                  <div style="font-weight:700;margin-bottom:6px">POI Actions</div>
                  <div style="display:flex;gap:8px;align-items:center">
                    <button id="fetchPois" style="background:#6b46c1;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer">Fetch POIs now</button>
                    <button id="fetchShow" style="background:#eef2ff;border:1px solid #ddd;padding:6px 8px;border-radius:6px;cursor:pointer">Show</button>
                  </div>
                </div>
              </div>

              <!-- Route controls + inputs the script expects (toggleable) -->
              <div id="poiHiddenControls" style="display:none;margin-top:6px;">
                <div style="display:flex;flex-direction:column;gap:6px">
                  <input id="locInput" placeholder="Location" style="padding:6px;border:1px solid #e5e7eb;border-radius:6px" />
                  <div style="display:flex;gap:6px">
                    <button id="addLocation" style="padding:6px 8px;border-radius:6px;border:1px solid #ddd;background:#fff">Add</button>
                    <button id="computeRoute" style="padding:6px 8px;border-radius:6px;border:1px solid #ddd;background:#fff">Compute</button>
                    <button id="clearRoute" style="padding:6px 8px;border-radius:6px;border:1px solid #ddd;background:#fff">Clear Route</button>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button id="mapAddToggle" style="padding:6px 8px;border-radius:6px;border:1px solid #ddd;background:#fff">Map add: off</button>
                    <button id="clearGeocodeCacheBtn" style="padding:6px 8px;border-radius:6px;border:1px solid #ddd;background:#fff">Clear Geo Cache</button>
                  </div>
                  <div id="routeList" style="max-height:120px;overflow:auto;border:1px solid #f1f5f9;padding:6px;border-radius:6px;background:#fff"></div>
                  <div style="display:flex;gap:6px">
                    <button id="loadSample" style="padding:6px 8px;border-radius:6px;border:1px solid #ddd;background:#fff">Load Sample</button>
                    <button id="clearAll" style="padding:6px 8px;border-radius:6px;border:1px solid #ddd;background:#fff">Clear All</button>
                    <button id="closeHiddenControls" style="padding:6px 8px;border-radius:6px;border:1px solid #ddd;background:#fff">Close</button>
                  </div>
                </div>
              </div>
              <script>
                (function(){
                  try{
                    var showBtn = document.getElementById('fetchShow');
                    var hidden = document.getElementById('poiHiddenControls');
                    var closeBtn = document.getElementById('closeHiddenControls');
                    if(showBtn && hidden){
                      showBtn.addEventListener('click', function(){
                        hidden.style.display = hidden.style.display === 'none' ? 'block' : 'none';
                      });
                    }
                    if(closeBtn && hidden){ closeBtn.addEventListener('click', function(){ hidden.style.display='none'; }); }
                  }catch(e){}
                })();
              </script>
          </div>
        </div>
      </div>
    `;

    // loader: fetch the static script and execute it via blob so we can add a small preamble
    const load = async () => {
      try {
        // Allow apps to override the source script URL
        const override = (typeof window !== 'undefined' && window.__OPENPOIMAP_SRC__) ? String(window.__OPENPOIMAP_SRC__) : null;
  // Raw commit URL for the specific demo commit you referenced
  const rawCommit = 'https://raw.githubusercontent.com/GetBack2Basics/TripCrafter/9292d697285c2772be3dd7d94c73d440d63643c4/public/openpoimap-lite.js';
  // Preferred remote canonical demo (Netlify / latest deployed demo)
  const canonicalRemote = 'https://tripcrafter.netlify.app/openpoimap-lite.js';

  // Try sources in order: override -> rawCommit -> canonicalRemote -> local
  const candidates = [];
        if (override) candidates.push(override);
  candidates.push(rawCommit);
  candidates.push(canonicalRemote);
  candidates.push('/openpoimap-lite.js');

        let code = null;
        let src = null;
        for (const c of candidates) {
          try {
            const resp = await fetch(c, { cache: 'no-store' });
            if (resp && resp.ok) {
              const text = await resp.text();
              if (text && text.length > 50) { // basic sanity check
                code = text;
                src = c;
                break;
              }
            }
          } catch (e) {
            // try next candidate
          }
        }

  if (!code) throw new Error('failed to fetch openpoimap-lite.js from candidates: ' + candidates.join(', '));

  // diagnostic: report which source we will inject so developers can verify it's the expected commit
  try { console.debug('OpenPoiMapLoader: selected openpoimap-lite source ->', src); } catch (e) {}

        // preamble to ensure previous map is destroyed
        const pre = `
        (function(){
          try {
            if (window.__OPENPOIMAP_EXPORTS__ && typeof window.__OPENPOIMAP_EXPORTS__.destroy === 'function') {
              try { window.__OPENPOIMAP_EXPORTS__.destroy(); } catch(e){}
            }
          } catch(e){}
          try {
            var c = document.getElementById('openpoimap-container');
            if (c) {
              // remove any leaflet containers left behind
              var oldLeaf = c.querySelectorAll('.leaflet-container, .leaflet-pane');
              for (var i=0;i<oldLeaf.length;i++) { try { oldLeaf[i].parentNode && oldLeaf[i].parentNode.removeChild(oldLeaf[i]); } catch(e){} }
              // remove any existing #map then recreate it cleanly
              var oldMap = c.querySelector('#map'); if (oldMap) { try { oldMap.parentNode && oldMap.parentNode.removeChild(oldMap); } catch(e){} }
              var newMap = document.createElement('div'); newMap.id = 'map'; newMap.style.width='100%'; newMap.style.height='100%'; c.appendChild(newMap);
            }
          } catch(e){}
          try { delete window.__OPENPOIMAP_EXPORTS__; } catch(e){}
        })();\n`;

        const wrapped = pre + '\n' + code + '\n';
        const blob = new Blob([wrapped], { type: 'application/javascript' });
        blobUrl = URL.createObjectURL(blob);
  scriptEl = document.createElement('script');
  scriptEl.src = blobUrl;
  scriptEl.async = true;
  scriptEl.dataset.openpoimap = 'true';
  document.body.appendChild(scriptEl);

        // When the legacy script runs it should populate window.__OPENPOIMAP_EXPORTS__
        // Listen for trip sync events and forward the data if exports are available
        const onSync = (e) => {
          try {
            const exports = window.__OPENPOIMAP_EXPORTS__;
            const payload = (e && e.detail) ? e.detail : (window.__TRIPCRAFT_TRIP__ || null);
            if (exports && typeof exports.reset === 'function' && payload && Array.isArray(payload.items)) {
              try { exports.reset(payload.items); } catch (err) { console.warn('openpoimap: reset failed', err); }
            }
            // also try to add POIs individually
            if (exports && typeof exports.addPoi === 'function' && payload && Array.isArray(payload.items)) {
              try { payload.items.forEach(it => { try { exports.addPoi(it); } catch(e){} }); } catch(e){}
            }
          } catch (err) { console.warn('openpoimap sync handler', err); }
        };

        window.addEventListener('tripcraft:syncTrip', onSync);

        // forward fly requests
        const onFly = (e) => {
          try {
            const exports = window.__OPENPOIMAP_EXPORTS__;
            const opts = (e && e.detail) ? e.detail : (window.__TRIPCRAFT_LAST_FLY_REQUEST__ || null);
            if (exports && typeof exports.flyTo === 'function' && opts) {
              try { exports.flyTo(opts); } catch (err) { console.warn('openpoimap flyTo failed', err); }
            }
          } catch (err) {}
        };
        window.addEventListener('tripcraft:flyTo', onFly);

        // Also if apps set window.__TRIPCRAFT_TRIP__ already, trigger a sync
        setTimeout(() => {
          try { window.dispatchEvent(new CustomEvent('tripcraft:syncTrip', { detail: window.__TRIPCRAFT_TRIP__ })); } catch(e){}
        }, 300);

        // cleanup function
        const cleanup = () => {
          try { window.removeEventListener('tripcraft:syncTrip', onSync); } catch(e){}
          try { window.removeEventListener('tripcraft:flyTo', onFly); } catch(e){}
          try { if (scriptEl && scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl); } catch(e){}
          try { if (blobUrl) URL.revokeObjectURL(blobUrl); } catch(e){}
          try { if (container) container.innerHTML = ''; } catch(e){}
          try { delete window.__OPENPOIMAP_EXPORTS__; } catch(e){}
          didMount = false;
        };

        // expose cleanup for debugging
        window.__OPENPOIMAP_LOADER_CLEANUP__ = cleanup;

        return cleanup;
      } catch (err) {
        console.warn('OpenPoiMapLoader failed to load', err);
        return () => {};
      }
    };

    let cleanupPromise = null;
    load().then((c) => { cleanupPromise = c; }).catch(() => {});

    return () => {
      try {
        if (typeof window.__OPENPOIMAP_LOADER_CLEANUP__ === 'function') {
          try { window.__OPENPOIMAP_LOADER_CLEANUP__(); } catch (e) {}
          try { delete window.__OPENPOIMAP_LOADER_CLEANUP__; } catch (e) {}
        }
        if (cleanupPromise && typeof cleanupPromise === 'function') cleanupPromise();
      } catch (e) {}
    };
  }, []);

  return null;
}
