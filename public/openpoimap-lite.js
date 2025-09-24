(function(){
  // Minimal standalone OpenPoiMap-like demo
  const map = L.map('map', { center:[44.402,10.424], zoom:10, zoomControl:false });

  const layers = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap contributors' }).addTo(map),
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution:'© OpenTopoMap contributors' }),
    carto: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', { attribution:'© CartoDB' })
  };

  function setBase(name){
    Object.values(layers).forEach(l=>map.removeLayer(l));
    layers[name].addTo(map);
  }

  document.querySelectorAll('input[name="base"]').forEach(r=>{
    r.addEventListener('change',e=>setBase(e.target.value));
  });

  // Simple controls
  document.getElementById('zoomIn').addEventListener('click',()=>map.zoomIn());
  document.getElementById('zoomOut').addEventListener('click',()=>map.zoomOut());
  document.getElementById('resetView').addEventListener('click',()=>map.setView([44.402,10.424],10));

  // per-category cluster groups
  const clusterGroups = new Map();
  const allClusters = L.layerGroup().addTo(map); // container to hold all clusters for easy clearing
  const poiCountEl = document.getElementById('poiCount');

  function randomNearby(lat, lng, rMeters){
    // Random point in meter circle
    const d = Math.sqrt(Math.random()) * rMeters;
    const ang = Math.random()*Math.PI*2;
    const dx = d*Math.cos(ang);
    const dy = d*Math.sin(ang);
    // Approx conversion meters->deg (lat/lng) approximate
    const lat2 = lat + (dy/111320);
    const lng2 = lng + (dx/(40075000*Math.cos(lat*Math.PI/180)/360));
    return [lat2,lng2];
  }

  // Create or reuse a simple divIcon for a logical category
  const iconCache = new Map();
  const colorMap = new Map();
  function makeCode(cat){
    if(!cat) return 'POI';
    // normalize and split words
    const parts = String(cat).replace(/[_\-]+/g,' ').split(/\s+/).filter(Boolean);
    if(parts.length >= 3){ return (parts[0][0]+parts[1][0]+parts[2][0]).toUpperCase(); }
    if(parts.length === 2){
      const a = parts[0].replace(/[^A-Za-z]/g,'');
      const b = parts[1].replace(/[^A-Za-z]/g,'');
      const code = (a[0] + (b[0]||'') + (a[1]||'')).toUpperCase();
      return code.padEnd(3,'X').slice(0,3);
    }
    const s = parts[0].replace(/[^A-Za-z]/g,'');
    return (s.substring(0,3).toUpperCase()).padEnd(3,'X');
  }
  function makeCategoryIcon(cat){
    // Coerce falsy categories to a stable string so we never try to read
    // properties like `.length` on undefined.
    const key = String(cat || '__');
    if (iconCache.has(key)) return iconCache.get(key);
    // pick a color per category (simple hash)
    const colors = ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f'];
    let sum = 0; for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    const color = colors[sum % colors.length];
    colorMap.set(key, color);
    const code = makeCode(key);
    const html = '<div class="poi-icon" style="background:'+color+'">'+code+'</div>';
    const ic = L.divIcon({ className: '', html: html, iconSize: [28, 28], iconAnchor: [14, 28] });
    iconCache.set(key, ic);
    return ic;
  }

  function getOrCreateCluster(cat){
    if(clusterGroups.has(cat)) return clusterGroups.get(cat);
    // color for cluster
    const ic = makeCategoryIcon(cat);
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      iconCreateFunction: function(cluster){
        // use the same color as the category icon
        const color = colorMap.get(cat) || '#888';
        const code = makeCode(cat);
        const html = '<div class="poi-icon small" style="background:'+color+'">'+code+'</div>';
        return L.divIcon({ html: html, className:'', iconSize:[28,28] });
      }
    });
    // clicking a cluster should toggle the overlay for this category
    cluster.on('clusterclick', function(ev){
      // prevent default zoom behavior
      ev.originalEvent && (L.DomEvent.stopPropagation(ev.originalEvent), L.DomEvent.preventDefault(ev.originalEvent));
      // toggle: if exists, remove cluster; otherwise generate markers
      const group = cat; // treat cluster id as a group key
      const mapped = groupMap[group] || [group];
      // determine current state (any of the mapped overlays active?)
      const anyActive = mapped.some(tag=> clusterGroups.get(tag) && clusterGroups.get(tag).getLayers().length>0);
      if(anyActive){
        // turn off all mapped overlays
        mapped.forEach(tag=>{
          const cgrp = clusterGroups.get(tag);
          if(cgrp){ cgrp.clearLayers(); allClusters.removeLayer(cgrp); clusterGroups.delete(tag); }
          const cb = document.querySelector('input[type="checkbox"][data-cat="'+tag+'"]'); if(cb) cb.checked = false;
        });
        highlightOverlays(mapped, false);
      } else {
        // turn on all mapped overlays (generate demo markers)
        const center = map.getCenter();
        mapped.forEach(tag=>{ for(let i=0;i<10;i++){ const p = randomNearby(center.lat, center.lng, 8000); addPoi(p[0], p[1], tag + ' '+(i+1), tag); } const cb = document.querySelector('input[type="checkbox"][data-cat="'+tag+'"]'); if(cb) cb.checked = true; });
        highlightOverlays(mapped, true);
      }
      // update count
      let count = 0; allClusters.eachLayer(cl=>{ try{ count += cl.getLayers().length }catch(e){} }); poiCountEl.textContent = count;
    });
    clusterGroups.set(cat, cluster);
    // add cluster to the parent group for visibility management
    allClusters.addLayer(cluster);
    return cluster;
  }

  // mapping of topbar groups to overlay tags
  // Generated from OpenPoiMap's opm.js layer definitions (transformed):
  // - k=v becomes the value 'v' (e.g. amenity=atm -> 'atm')
  // - k~'a|b' becomes ['a','b']
  // - k=yes becomes the key 'k' (e.g. tourism=yes -> 'tourism')
  const groupMap = {
    amenity: [
      'atm','bank','bench','bicycle_parking','bicycle_rental','cinema','clinic','embassy','fire_station','fuel','hospital','library','music_school','parking','pharmacy','place_of_worship','police','post_box','post_office','school','college','taxi','theatre','toilets','university','cemetery','buddhist','christian','hindu','jewish','muslim'
    ],
    tourism: [
      'arts_centre','statue','castle','vineyard','casino','picnic_table','watermill','windmill','monument','tree','artwork','attraction','gallery','information','museum','picnic_site','theme_park','viewpoint','tourism','zoo'
    ],
    hotels: [
      'casino','sauna','spa','alpine_hut','apartment','camp_site','chalet','guest_house','bed_and_breakfast','hostel','hotel','motel'
    ],
    sport: [
      'golf_course','ice_rink','sports_centre','american_football','baseball','basketball','cycling','equestrian','field_hockey','golf','gymnastics','hockey','horse_racing','ice_hockey','soccer','surfing','swimming','tennis','volleyball'
    ],
    shop: [
      'marketplace','beauty','bicycle','books','stationary','car','chemist','clothes','copyshop','cosmetics','department_store','garden_centre','general','gift','hairdresser','kiosk','leather','mall','mobile_phone','musical_instrument','optician','pets','photo','shoes','textiles','toys'
    ],
    food: [
      'drinking_water','alcohol','bakery','beverages','butcher','cheese','coffee','dairy','deli','delicatessen','grocery','organic','seafood','supermarket','wine'
    ],
    restaurants: [
      'bar','bbq','biergarten','cafe','fast_food','food_court','ice_cream','pub','restaurant'
    ],
    various: [
      'charging_station','marketplace','recycling','bicycle','defibrillator','fire_extinguisher','fire_hose','bus_stop','construction','city','hamlet','suburb','town','village','travel_agency'
    ]
  };

  function highlightOverlays(list, on){
    list.forEach(tag=>{
      // highlight the label in the right panel if present
      const label = Array.from(document.querySelectorAll('.overlayList label')).find(l=>{
        const inp = l.querySelector('input[data-cat]'); return inp && inp.getAttribute('data-cat')===tag;
      });
      if(label){ if(on) label.classList.add('overlay-highlight'); else label.classList.remove('overlay-highlight'); }
    });
  }

  // Helpers for info popups: escape HTML and produce JSON + OpenPoiMap group info
  function escapeHtml(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  // Return OpenPoiMap groups for a tag; if tag is falsy, attempt to infer groups from a text snippet
  function getGroupsForTag(tag, text){
    const groups = [];
    if(tag){
      for(const g in groupMap){ if(Array.isArray(groupMap[g]) && groupMap[g].indexOf(tag)!==-1) groups.push(g); }
      return groups;
    }
    // infer from text: scan for any token matches
    if(!text) return groups;
    const t = String(text).toLowerCase();
    for(const g in groupMap){
      const tokens = groupMap[g];
      for(const tok of tokens){
        if(!tok) continue;
        if(t.indexOf(tok.replace(/_/g,' '))!==-1 || t.indexOf(tok)!==-1){ groups.push(g); break; }
      }
    }
    // unique
    return Array.from(new Set(groups));
  }
  function createInfoPopupContent(obj, tag){
    const json = escapeHtml(JSON.stringify(obj, null, 2));
  const textHint = obj.name || obj.label || obj.title || obj.display_name || '';
  const groups = getGroupsForTag(tag, textHint);
    const title = escapeHtml(obj.name || obj.label || obj.title || obj.display_name || 'POI');
    let html = `<div style="max-width:360px;"><div style="font-weight:700;margin-bottom:6px;">${title}</div>`;
    if(tag){ html += `<div style="font-size:12px;color:#444;margin-bottom:6px;"><strong>Category:</strong> ${escapeHtml(tag)}</div>`; }
    if(groups && groups.length){ html += `<div style="font-size:12px;color:#444;margin-bottom:6px;"><strong>OpenPoiMap groups:</strong> ${escapeHtml(groups.join(', '))}</div>`; }
    html += `<pre style="white-space:pre-wrap;background:#f7f7f7;padding:6px;border-radius:4px;margin:6px 0;">${json}</pre></div>`;
    return html;
  }

  function addPoi(lat,lng,name, category){
    // Only include the icon option when a category is provided. Passing
    // `icon: undefined` can break Leaflet's internal marker creation (options.icon
    // would be undefined and Marker tries to call createIcon on it).
  const mk = category ? L.marker([lat,lng], { icon: makeCategoryIcon(category) }) : L.marker([lat,lng]);
    const meta = { name: name, category: category, lat: lat, lng: lng };
    mk.bindPopup(createInfoPopupContent(meta, category));
    mk.on('click',()=>mk.openPopup());
    if(category){
      const cluster = getOrCreateCluster(category);
      cluster.addLayer(mk);
    } else {
      // fallback: add to general cluster group
      let generic = getOrCreateCluster('__generic__');
      generic.addLayer(mk);
    }
  }

  // --- Route planner support ---
  let routePoints = []; // {label, lat, lng}
  let routeLayer = null;
  let routeMarkers = [];
  let waypointMarkers = [];
  let mapAddMode = false;

  async function geocodeLocation(location){
    try{
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if(data && data.length>0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name };
    }catch(e){ console.error('Geocode error', e); }
    return null;
  }

  // --- Geocode caching (localStorage) ---------------------------------
  const GEOCODE_CACHE_KEY = 'openpoimap_geocode_v1';
  let __geocodeCache = null; // in-memory cache mirror

  function loadGeocodeCache(){
    if(__geocodeCache) return __geocodeCache;
    try{
      const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
      __geocodeCache = raw ? JSON.parse(raw) : {};
    }catch(e){ __geocodeCache = {}; }
    return __geocodeCache;
  }

  function saveGeocodeCache(){
    try{ localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(__geocodeCache || {})); }catch(e){ /* ignore */ }
  }

  function normalizeLocationKey(loc){
    if(!loc) return '__';
    // similar normalization as sample loader: trim, lower, remove extra whitespace
    return String(loc).replace(/\bto\b/i,'').replace(/[\u2013\u2014\u2012]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
  }

  async function getCachedGeocode(location){
    const cache = loadGeocodeCache();
    const key = normalizeLocationKey(location);
    if(cache && cache[key]){
      try{ logStatus('Geocode cache hit: '+location); }catch(e){}
      return cache[key];
    }
    try{ logStatus('Geocode cache miss: '+location); }catch(e){}
    const g = await geocodeLocation(location);
    if(g){
      // store minimal payload
      cache[key] = { lat: g.lat, lng: g.lng, display_name: g.display_name, updatedAt: (new Date()).toISOString() };
      __geocodeCache = cache;
      try{ saveGeocodeCache(); }catch(e){}
    }
    return g;
  }

  function logStatus(msg){
    try{
      const el = document.getElementById('loaderStatus');
      const t = document.createElement('div'); t.textContent = msg; el.appendChild(t); el.scrollTop = el.scrollHeight;
    }catch(e){}
  }

  async function getRouteOSRM(points){
    if(!points || points.length<2) return null;
    const coords = points.map(p=>`${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
    try{
      const r = await fetch(url);
      const d = await r.json();
      if(d && d.routes && d.routes.length>0) return d.routes[0];
    }catch(e){ console.error('Routing error', e); }
    return null;
  }

  // --- Optional Firebase integration (lightweight, dynamic) -----------------
  // Behavior:
  // - If the page exposes a global `__FIREBASE_CONFIG__` object (or if
  //   window.firebase already exists), we attempt to load the Firebase
  //   compat SDK dynamically and use Firestore to read/write trip items and
  //   routeSegments under the same `artifacts/${projectId}/public/data/trips/...`
  // - If Firebase is not configured, we silently fall back to localStorage.

  let FIRESTORE = null;
  let FIREBASE_PROJECT_ID = null;

  function isFirebaseAvailable() {
    return !!FIRESTORE;
  }

  function loadFirebaseSdkIfNeeded() {
    // If FIRESTORE already set, resolve immediately
    if (FIRESTORE) return Promise.resolve(FIRESTORE);
    // Look for an injected config object
    const cfg = window.__FIREBASE_CONFIG__ || window.__firebase_config || (window.__APP && window.__APP.firebaseConfig) || null;
    if (!cfg) return Promise.resolve(null);
    FIREBASE_PROJECT_ID = cfg.projectId || cfg.projectID || cfg.project || cfg['project_id'] || null;

    // Load compat SDKs (app + firestore) so code can run in this static page
    const scripts = [
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js'
    ];

    return new Promise((resolve) => {
      let loaded = 0;
      function onLoad() {
        loaded++;
        if (loaded === scripts.length) {
          try {
            if (!window.firebase || !window.firebase.initializeApp) return resolve(null);
            try { window.firebase.initializeApp(cfg); } catch (e) { /* already initialized possibly */ }
            try { FIRESTORE = window.firebase.firestore(); } catch (e) { FIRESTORE = null; }
            return resolve(FIRESTORE);
          } catch (e) {
            console.warn('Firebase init failed', e); return resolve(null);
          }
        }
      }
      scripts.forEach(src => {
        const s = document.createElement('script'); s.src = src; s.onload = onLoad; s.onerror = onLoad; document.head.appendChild(s);
      });
    });
  }

  // Firestore helpers (fall back to localStorage when unavailable)
  function tripItemsDocPath(tripId) {
    // document path: artifacts/{projectId}/public/data/trips/{tripId}/items
    return `artifacts/${FIREBASE_PROJECT_ID || 'local'}/public/data/trips/${tripId}/items`;
  }

  async function fetchTripItemsFromFirestore(tripId) {
    if (!tripId) return null;
    if (!isFirebaseAvailable()) return null;
    try {
      const docRef = FIRESTORE.doc(tripItemsDocPath(tripId));
      const snap = await docRef.get();
      if (snap && snap.exists) {
        const data = snap.data ? snap.data() : (snap.data || snap);
        // Accept either array at data.items or top-level array
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data)) return data;
        return null;
      }
    } catch (e) { console.warn('fetchTripItemsFromFirestore failed', e); }
    return null;
  }

  async function saveTripItemsToFirestore(tripId, items) {
    if (!tripId || !items) return false;
    // save as a single doc with field `items` to make reads simpler
    if (isFirebaseAvailable()) {
      try {
        const docRef = FIRESTORE.doc(tripItemsDocPath(tripId));
        await docRef.set({ items: items, updatedAt: new Date().toISOString() }, { merge: true });
        return true;
      } catch (e) { console.warn('saveTripItemsToFirestore failed', e); }
    }
    // fallback localStorage
    try { localStorage.setItem(`tripItems:${tripId}`, JSON.stringify(items)); return true; } catch (e) { return false; }
  }

  async function loadTripItemsCached(tripId) {
    // Try Firestore first, then localStorage
    try {
      const r = await fetchTripItemsFromFirestore(tripId);
      if (r && r.length) return r;
    } catch (e) {}
    try { const raw = localStorage.getItem(`tripItems:${tripId}`); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  // Ensure a trip is persisted to Firestore on first-run when available
  // This is generic for any tripId and will write the provided `items`
  // to Firestore if no server copy exists yet (and mark a local flag
  // so the browser doesn't repeatedly attempt the write).
  async function ensureTripPersistedToFirestore(tripId, items) {
    if (!tripId || !items || !items.length) return;
    // Use a local flag to avoid repeated writes from the same browser
    try {
      const localFlag = localStorage.getItem(`tripSavedToFirestore:${tripId}`);
      if (localFlag) return; // already wrote from this browser
    } catch (e) {}

    try {
      await loadFirebaseSdkIfNeeded();
    } catch (e) {}

    if (!isFirebaseAvailable()) {
      // nothing to do if Firestore not configured
      return;
    }

    try {
      // If a server-side copy already exists, skip writing
      const existing = await fetchTripItemsFromFirestore(tripId);
      if (existing && Array.isArray(existing) && existing.length > 0) {
        try { localStorage.setItem(`tripSavedToFirestore:${tripId}`, new Date().toISOString()); } catch (e) {}
        return;
      }
    } catch (e) { /* continue to attempt save */ }

    try {
      await saveTripItemsToFirestore(tripId, items);
      try { localStorage.setItem(`tripSavedToFirestore:${tripId}`, new Date().toISOString()); } catch (e) {}
      try { logStatus('Sample trip persisted to Firestore (first-run)'); } catch (e) {}
    } catch (e) {
      console.warn('Failed to persist sample trip to Firestore', e);
    }
  }

  // routeSegments helpers (match TripMap.js pattern)
  function getSegmentDocRefPath(tripId, fromId, toId) {
    const id = `${fromId || 'null'}__${toId || 'null'}`;
    return `artifacts/${FIREBASE_PROJECT_ID || 'local'}/public/data/trips/${tripId}/routeSegments/${id}`;
  }

  async function loadSegmentCachedFirestore(tripId, fromId, toId) {
    if (!tripId) return null;
    if (!isFirebaseAvailable()) return null;
    try {
      const path = getSegmentDocRefPath(tripId, fromId, toId);
      const docRef = FIRESTORE.doc(path);
      const snap = await docRef.get();
      if (snap && snap.exists) return snap.data ? snap.data() : (snap.data || snap);
    } catch (e) { console.warn('loadSegmentCachedFirestore failed', e); }
    return null;
  }

  // localStorage loader for route segments (used as a fallback or to inspect cached segments)
  function loadSegmentCachedLocal(tripId, fromId, toId){
    try{
      const k = `tripRouteSegment:${tripId}:${fromId || 'null'}:${toId || 'null'}`;
      const raw = localStorage.getItem(k);
      if(!raw) return null;
      const obj = JSON.parse(raw);
      return obj;
    }catch(e){ return null; }
  }

  async function saveSegmentCachedFirestore(tripId, fromId, toId, segment) {
    if (!tripId || !segment) return false;
    if (isFirebaseAvailable()) {
      try {
        const path = getSegmentDocRefPath(tripId, fromId, toId);
        const docRef = FIRESTORE.doc(path);
        await docRef.set({ ...segment, fromId, toId, updatedAt: new Date().toISOString() }, { merge: true });
        return true;
      } catch (e) { console.warn('saveSegmentCachedFirestore failed', e); }
    }
    // fallback to localStorage
    try {
      const k = `tripRouteSegment:${tripId}:${fromId || 'null'}:${toId || 'null'}`;
      localStorage.setItem(k, JSON.stringify({ ...segment, fromId, toId, updatedAt: new Date().toISOString() }));
      return true;
    } catch (e) { console.warn('saveSegmentCached localStorage failed', e); }
    return false;
  }


  function renderRoute(routeGeojson, points){
    // clear previous
    if(routeLayer){ map.removeLayer(routeLayer); routeLayer = null; }
    routeMarkers.forEach(m=>map.removeLayer(m)); routeMarkers = [];
    if(!routeGeojson || !routeGeojson.coordinates) return;
    const coords = routeGeojson.coordinates.map(c=>[c[1], c[0]]);
    routeLayer = L.polyline(coords, { color:'#f59e42', weight:4, opacity:0.9 }).addTo(map);
    // create numbered markers for waypoints
    points.forEach((p, idx)=>{
      const meta = Object.assign({}, p, { index: idx+1 });
      let m;
      try {
        m = L.marker([p.lat,p.lng], { icon: L.divIcon({ html:`<div class='poi-icon small' style='background:#4F46E5'>${String(idx+1)}</div>`, className:'', iconSize:[28,28] }) }).addTo(map);
      } catch (e) {
        console.warn('Marker creation with divIcon failed, falling back to default marker', e);
        m = L.marker([p.lat,p.lng]).addTo(map);
      }
      m.bindPopup(createInfoPopupContent(meta, null));
      m.on('click', ()=> m.openPopup());
      routeMarkers.push(m);
    });
    // fit map
    try{ map.fitBounds(routeLayer.getBounds(), { padding:[40,40] }); }catch(e){}
  }

  // --- Segment debug UI --------------------------------------------------
  const _segmentDebugRecords = [];
  function addSegmentDebugRecord(tripId, fromId, toId, source, info){
    const rec = { tripId, fromId, toId, source: source || 'unknown', info: info || null, ts: (new Date()).toISOString() };
    _segmentDebugRecords.push(rec);
    renderSegmentDebug();
  }

  function renderSegmentDebug(){
    try{
      let container = document.getElementById('segmentDebug');
      if(!container){
        container = document.createElement('div'); container.id = 'segmentDebug';
        container.style.position='fixed'; container.style.right='12px'; container.style.bottom='12px'; container.style.maxHeight='240px';
        container.style.overflow='auto'; container.style.background='rgba(255,255,255,0.95)'; container.style.border='1px solid #ddd'; container.style.padding='8px';
        container.style.fontSize='12px'; container.style.zIndex = 99999; container.style.width='320px'; container.style.boxShadow='0 6px 18px rgba(0,0,0,0.12)';
        const title = document.createElement('div'); title.textContent='Segment cache debug (recent)'; title.style.fontWeight='700'; title.style.marginBottom='6px'; container.appendChild(title);
        const clear = document.createElement('button'); clear.textContent='Clear'; clear.style.float='right'; clear.style.marginTop='-22px'; clear.onclick=()=>{ _segmentDebugRecords.length=0; renderSegmentDebug(); };
        container.appendChild(clear);
        const list = document.createElement('div'); list.id='segmentDebugList'; container.appendChild(list);
        document.body.appendChild(container);
      }
      const list = container.querySelector('#segmentDebugList');
      list.innerHTML = '';
      const recent = _segmentDebugRecords.slice(-60).reverse();
      for(const r of recent){
        const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.marginBottom='6px'; row.style.borderBottom='1px dashed #eee'; row.style.paddingBottom='4px';
        const left = document.createElement('div'); left.style.flex='1'; left.innerHTML = `<div style="font-weight:600">${r.tripId} [${r.fromId}→${r.toId}]</div><div style="color:#555">${r.source}${r.info?(' • '+String(r.info)):''}</div><div style="color:#888;font-size:11px">${r.ts}</div>`;
        row.appendChild(left);
        list.appendChild(row);
      }
    }catch(e){/* ignore UI errors */}
  }

  function refreshRouteList(){
    const el = document.getElementById('routeList');
    el.innerHTML = '';
    routePoints.forEach((p,idx)=>{
      const row = document.createElement('div');
      row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center'; row.style.padding='4px 2px';
      row.innerHTML = `<div style="flex:1">${idx+1}. ${p.label||p.display_name||'(unknown)'}</div>`;
      const btns = document.createElement('div');
      btns.innerHTML = `<button data-idx='${idx}' class='route-up' style='margin-right:6px'>↑</button><button data-idx='${idx}' class='route-down' style='margin-right:6px'>↓</button><button data-idx='${idx}' class='route-remove'>✖</button>`;
      row.appendChild(btns);
      el.appendChild(row);
    });
    // bind actions
    Array.from(document.querySelectorAll('.route-up')).forEach(b=>b.addEventListener('click',(e)=>{ const i=+e.target.getAttribute('data-idx'); if(i>0){ const tmp=routePoints[i-1]; routePoints[i-1]=routePoints[i]; routePoints[i]=tmp; refreshRouteList(); } }));
    Array.from(document.querySelectorAll('.route-down')).forEach(b=>b.addEventListener('click',(e)=>{ const i=+e.target.getAttribute('data-idx'); if(i<routePoints.length-1){ const tmp=routePoints[i+1]; routePoints[i+1]=routePoints[i]; routePoints[i]=tmp; refreshRouteList(); } }));
    Array.from(document.querySelectorAll('.route-remove')).forEach(b=>b.addEventListener('click',(e)=>{ const i=+e.target.getAttribute('data-idx'); routePoints.splice(i,1); refreshRouteList(); }));
  }

  document.getElementById('addLocation').addEventListener('click', async ()=>{
    const v = document.getElementById('locInput').value.trim();
    if(!v) return;
    const g = await geocodeLocation(v);
    if(g){ routePoints.push({ label: v, lat: g.lat, lng: g.lng, display_name: g.display_name }); refreshRouteList(); document.getElementById('locInput').value=''; }
    else { alert('Location not found'); }
  });

  document.getElementById('computeRoute').addEventListener('click', async ()=>{
    if(routePoints.length<2){ alert('Add at least two points'); return; }
    const r = await getRouteOSRM(routePoints);
    // helper to ensure visible waypoint markers
    function createWaypointMarkersIfNeeded(){
      if(waypointMarkers.length>0) return;
      routePoints.forEach((p, idx)=>{
        const meta = Object.assign({}, p, { index: idx+1 });
        let m;
        try {
          m = L.marker([p.lat,p.lng], { icon: L.divIcon({ html:`<div class='poi-icon small' style='background:#06b6d4'>${String(idx+1)}</div>`, className:'', iconSize:[28,28] }) }).addTo(map);
        } catch (e) {
          console.warn('Marker creation with divIcon failed, falling back to default marker', e);
          m = L.marker([p.lat,p.lng]).addTo(map);
        }
        m.bindPopup(createInfoPopupContent(meta, null));
        m.on('click', ()=> m.openPopup());
        waypointMarkers.push(m);
      });
    }

    if(r){
      renderRoute(r.geometry, routePoints);
      // show summary
      const summary = `Route: ${(r.distance/1000).toFixed(1)} km, ${(Math.round(r.duration/60))} mins`;
      const el = document.getElementById('poiStatus'); el.textContent = 'POIs: '+ (poiCountEl.textContent || 0) + ' • ' + summary;
      // fit to full route geometry bounds
      try{
        const routeBounds = L.polyline(r.geometry.coordinates.map(c=>[c[1],c[0]])).getBounds();
        map.fitBounds(routeBounds.pad ? routeBounds.pad(0.15) : routeBounds, { padding:[40,40] });
      }catch(e){
        // fallback to waypoint bounds
        const bounds = L.latLngBounds(routePoints.map(p=>[p.lat,p.lng]));
        try{ map.fitBounds(bounds.pad ? bounds.pad(0.15) : bounds, { padding:[40,40] }); }catch(e){}
      }
      createWaypointMarkersIfNeeded();
    } else {
      // routing failed — at least zoom to include all waypoints and ensure markers
      createWaypointMarkersIfNeeded();
      if(routePoints.length>0){
        const bounds = L.latLngBounds(routePoints.map(p=>[p.lat,p.lng]));
        try{ map.fitBounds(bounds.pad ? bounds.pad(0.15) : bounds, { padding:[40,40] }); }catch(e){}
      }
      alert('Routing failed — zoomed to waypoints');
    }
  });

  document.getElementById('clearRoute').addEventListener('click', ()=>{ 
    routePoints=[]; 
    if(routeLayer){ map.removeLayer(routeLayer); routeLayer=null; }
    routeMarkers.forEach(m=>map.removeLayer(m)); routeMarkers=[]; 
    waypointMarkers.forEach(m=>map.removeLayer(m)); waypointMarkers=[];
    refreshRouteList(); 
    document.getElementById('poiStatus').textContent = 'POIs: '+ (poiCountEl.textContent || 0);
  });

  document.getElementById('mapAddToggle').addEventListener('click', (e)=>{
    mapAddMode = !mapAddMode; e.target.textContent = 'Map add: ' + (mapAddMode ? 'on' : 'off');
  });

  // Clear geocode cache button (if present in the HTML)
  try{
    const clearBtn = document.getElementById('clearGeocodeCacheBtn');
    if(clearBtn){
      clearBtn.addEventListener('click', ()=>{
        try{ __geocodeCache = {}; localStorage.removeItem(GEOCODE_CACHE_KEY); logStatus('Geocode cache cleared'); alert('Geocode cache cleared'); }catch(e){ console.warn('Failed to clear cache', e); }
      });
    }
  }catch(e){}

  // --- Sample trip loader (fetches sample-trip.json) ---
  async function loadSampleTrip(){
    try{
      // Ensure Firebase SDK loaded if present on the host page
      await loadFirebaseSdkIfNeeded();

      const SAMPLE_TRIP_ID = 'paris-sample';

      // First try to load trip items from Firestore/local cache
      let sample = await loadTripItemsCached(SAMPLE_TRIP_ID);
      if (!sample || !Array.isArray(sample) || sample.length === 0) {
        // fallback to baked-in sample file
        const resp = await fetch('/sample-trip.json');
        sample = await resp.json();
        // persist a copy locally for next loads (localStorage or Firestore when available)
        try { await saveTripItemsToFirestore(SAMPLE_TRIP_ID, sample); } catch (e) {}
      }
  // Ensure a server-side copy exists on first-run when Firestore is configured
  try { ensureTripPersistedToFirestore(SAMPLE_TRIP_ID, sample); } catch (e) { /* ignore */ }
      routePoints = [];
      // clear previous waypoint markers
      waypointMarkers.forEach(m=>map.removeLayer(m)); waypointMarkers = [];
      refreshRouteList();
      document.getElementById('poiStatus').textContent = 'Loading sample...';
      const normalized = [];
      for(const item of sample){
        let loc = item.location || '';
        if(/\bto\b/i.test(loc)){
          const parts = loc.split(/\bto\b/i).map(s=>s.trim());
          loc = parts[parts.length-1];
        }
        if(normalized.length===0 || normalized[normalized.length-1].location !== loc){ normalized.push({ location: loc, title: item.title }); }
      }
      const bounds = L.latLngBounds();
      // normalized contains unique location strings from sample items; we need to map them back to trip items
      for(const n of normalized){
        try{
          logStatus('Geocoding: '+n.location);
          // Use cached geocode lookup to avoid repeated Nominatim calls across sessions
          const g = await getCachedGeocode(n.location);
          if(g){ logStatus(`✓ ${n.location} → ${g.lat.toFixed(5)},${g.lng.toFixed(5)}`); routePoints.push({ label: n.title || n.location, lat: g.lat, lng: g.lng, display_name: g.display_name || g.display_name }); bounds.extend([g.lat,g.lng]); refreshRouteList(); }
          else { logStatus('✗ geocode miss for '+n.location); console.warn('Geocode miss for', n.location); }
          // still add a short pause to be friendly to the geocode service on first-run
          await new Promise(r=>setTimeout(r, 400));
        }catch(e){ console.error('Error geocoding', n.location, e); }
      }
      // fit the map to all waypoints if any
      if(routePoints.length>0){
        try{ map.fitBounds(bounds.pad(0.2)); }catch(e){}
        // add visible waypoint markers for each point so user sees them even if routing fails
        routePoints.forEach((p, idx)=>{
          const meta = Object.assign({}, p, { index: idx+1 });
          let m;
          try {
            m = L.marker([p.lat,p.lng], { icon: L.divIcon({ html:`<div class='poi-icon small' style='background:#06b6d4'>${String(idx+1)}</div>`, className:'', iconSize:[28,28] }) }).addTo(map);
          } catch (e) {
            console.warn('Marker creation with divIcon failed, falling back to default marker', e);
            m = L.marker([p.lat,p.lng]).addTo(map);
          }
          m.bindPopup(createInfoPopupContent(meta, null));
          m.on('click', ()=> m.openPopup());
          waypointMarkers.push(m);
        });
        document.getElementById('poiStatus').textContent = 'Loaded '+routePoints.length+' points';
      }
        if(routePoints.length>1){
          logStatus('Requesting route from OSRM for '+routePoints.length+' points...');
          // Before calling OSRM, attempt to load any cached segments between consecutive points
          const tripId = SAMPLE_TRIP_ID;
          const segments = [];
          for(let i=0;i<routePoints.length-1;i++){
            const fromId = String(i);
            const toId = String(i+1);
            let seg = null;
            // try Firestore (if configured)
            try { seg = await loadSegmentCachedFirestore(tripId, fromId, toId); if(seg && seg.geometry){ addSegmentDebugRecord(tripId, fromId, toId, 'firestore'); } } catch(e){ seg=null; }
            // fallback to localStorage cached segment
            if(!seg){
              try{ const localSeg = loadSegmentCachedLocal(tripId, fromId, toId); if(localSeg && localSeg.geometry){ seg = localSeg; addSegmentDebugRecord(tripId, fromId, toId, 'local'); } }catch(e){}
            }
            if(seg && seg.geometry) {
              segments.push(seg);
            } else {
              // fetch pair-wise segment from OSRM and store it
              try {
                const pair = [ { lat: routePoints[i].lat, lng: routePoints[i].lng }, { lat: routePoints[i+1].lat, lng: routePoints[i+1].lng } ];
                const routeResp = await getRouteOSRM(pair);
                if(routeResp && routeResp.geometry) {
                  const saved = { geometry: routeResp.geometry, legs: routeResp.legs || null, duration: routeResp.duration || null, distance: routeResp.distance || null };
                  try { await saveSegmentCachedFirestore(tripId, fromId, toId, saved); addSegmentDebugRecord(tripId, fromId, toId, 'osrm', 'fetched and saved'); } catch (e) { addSegmentDebugRecord(tripId, fromId, toId, 'osrm', 'fetched'); }
                  segments.push(saved);
                } else {
                  addSegmentDebugRecord(tripId, fromId, toId, 'osrm', 'no-route');
                }
              } catch (e) { console.warn('pairwise OSRM failed', e); addSegmentDebugRecord(tripId, fromId, toId, 'osrm', 'error'); }
            }
          }

          // Concatenate segments if available, else fall back to full OSRM route request
          let assembled = null;
          if(segments.length === routePoints.length-1){
            // assemble full coords in [lng,lat] order (OSRM standard)
            const fullCoordsLngLat = [];
            for(const s of segments){
              if(!s || !s.geometry || !Array.isArray(s.geometry.coordinates)) continue;
              // s.geometry.coordinates are expected as [lng,lat]
              const coordsArr = s.geometry.coordinates.slice();
              // avoid duplicating the junction point between segments
              if(fullCoordsLngLat.length>0) coordsArr.shift();
              fullCoordsLngLat.push(...coordsArr);
            }
            if(fullCoordsLngLat.length>0){
              // prepare a latlngs array for Leaflet (array of [lat,lng])
              const latlngs = fullCoordsLngLat.map(c=>[c[1], c[0]]);
              assembled = { geometry: { coordinates: fullCoordsLngLat }, latlngs, fullCoordsLngLat };
            }
          }

          if(assembled){
            logStatus('✓ assembled route from cached segments — drawing');
            // renderRoute expects geometry.coordinates as [lng,lat]
            renderRoute(assembled.geometry, routePoints);
            try{ map.fitBounds(L.polyline(assembled.latlngs).getBounds().pad(0.15)); }catch(e){}
          }
          else { const r = await getRouteOSRM(routePoints); if(r){ logStatus('✓ route received — drawing'); renderRoute(r.geometry, routePoints); try{ map.fitBounds(L.polyline(r.geometry.coordinates.map(c=>[c[1],c[0]])).getBounds().pad(0.15)); }catch(e){} } else { logStatus('✗ routing failed'); document.getElementById('poiStatus').textContent += ' • routing failed'; } }
        }
    }catch(e){ console.error('Failed to load sample trip', e); alert('Failed to load sample trip'); }
  }

  document.getElementById('loadSample').addEventListener('click', ()=>{ loadSampleTrip(); });

  map.on('click', async (ev)=>{
    if(!mapAddMode) return;
    const lat = ev.latlng.lat, lng = ev.latlng.lng;
    // reverse geocode briefly to supply a label
    try{
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const d = await res.json();
      const label = d && d.display_name ? d.display_name.split(',')[0] : `${lat.toFixed(5)},${lng.toFixed(5)}`;
      routePoints.push({ label, lat, lng, display_name: d && d.display_name }); refreshRouteList();
    }catch(e){ routePoints.push({ label: `${lat.toFixed(5)},${lng.toFixed(5)}`, lat, lng }); refreshRouteList(); }
  });


  function fetchDemoPois(){
    // clear existing clusters and generate generic demo POIs
    allClusters.clearLayers();
    clusterGroups.clear();
    const center = map.getCenter();
    const generic = getOrCreateCluster('__generic__');
    for(let i=0;i<120;i++){
      const p = randomNearby(center.lat, center.lng, 20000);
      addPoi(p[0],p[1],'POI '+(i+1));
    }
    // update count
    let count = 0; allClusters.eachLayer(cl=>{ try{ count += cl.getLayers().length }catch(e){} }); poiCountEl.textContent = count;
  }

  document.getElementById('fetchPois').addEventListener('click',fetchDemoPois);
  document.getElementById('clearAll').addEventListener('click',()=>{
    // clear all POIs and reset overlay checkbox state so users can re-enable overlays
    allClusters.clearLayers();
    clusterGroups.clear();
    poiCountEl.textContent = 0;
    document.querySelectorAll('[data-cat]').forEach(cb=>{ cb.checked = false; });
  });

  // Checkboxes in overlays
  document.querySelectorAll('[data-cat]').forEach(cb=>{
    cb.addEventListener('change',()=>{
      // just add or remove a handful of demo markers for the checked category
      if(cb.checked){
        const c = map.getCenter();
        const cat = cb.getAttribute('data-cat');
        for(let i=0;i<10;i++){ const p=randomNearby(c.lat,c.lng,8000); addPoi(p[0],p[1],cat+' '+(i+1), cat); }
      } else {
        // remove the category cluster from the map
        const cat = cb.getAttribute('data-cat');
        const cluster = clusterGroups.get(cat);
        if(cluster){ cluster.clearLayers(); allClusters.removeLayer(cluster); clusterGroups.delete(cat); }
      }
      // recalc count
      let count = 0; allClusters.eachLayer(cl=>{ try{ count += cl.getLayers().length }catch(e){} }); poiCountEl.textContent = count;
    });
  });

  // Topbar quick category buttons: add/remove demo markers for that logical category
  // (right-panel checkboxes use different tag names, so topbar buttons manage their own demo markers)
  document.querySelectorAll('#categoryBar [data-cat]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const group = btn.getAttribute('data-cat');
      const mapped = groupMap[group] || [group];
      const anyActive = mapped.some(tag=> clusterGroups.get(tag) && clusterGroups.get(tag).getLayers().length>0);
      if(anyActive){
        mapped.forEach(tag=>{ const cgrp = clusterGroups.get(tag); if(cgrp){ cgrp.clearLayers(); allClusters.removeLayer(cgrp); clusterGroups.delete(tag); } const cb = document.querySelector('input[type="checkbox"][data-cat="'+tag+'"]'); if(cb) cb.checked = false; });
        highlightOverlays(mapped, false);
      } else {
        const center = map.getCenter();
        mapped.forEach(tag=>{ for(let i=0;i<10;i++){ const p=randomNearby(center.lat, center.lng, 8000); addPoi(p[0], p[1], tag+' '+(i+1), tag); } const cb = document.querySelector('input[type="checkbox"][data-cat="'+tag+'"]'); if(cb) cb.checked = true; });
        highlightOverlays(mapped, true);
      }
      // update POI counter
      let count = 0; allClusters.eachLayer(cl=>{ try{ count += cl.getLayers().length }catch(e){} }); poiCountEl.textContent = count;
    });
  });

  // initial
  setBase('osm');
  // Auto-load Paris sample trip when ?owner=<ownerId> or ?trip=paris is present in the URL.
  // Additionally, for the deployed demo page we want to show the itinerary by default
  // so users opening the standalone demo URL see the Paris trip without query params.
  (function(){
    try{
      const params = new URLSearchParams(window.location.search);
      const owner = params.get('owner');
      const trip = params.get('trip');
      const AUTO_OWNER = 'Yc1vLpmyYXg8PLGJKLaYUDdbwHI3';
      // If explicit param matches, load sample
      if(owner === AUTO_OWNER || trip === 'paris'){
        loadSampleTrip();
        return;
      }
      // If this is the demo page on the deployed site (or the file path), prefer the sample trip
      const host = (window && window.location && window.location.hostname) ? window.location.hostname : '';
      const path = (window && window.location && window.location.pathname) ? window.location.pathname : '';
      const isDeployedDemo = host.indexOf('tripcrafter.netlify.app') !== -1 || path.indexOf('openpoimap-lite') !== -1;
      if(isDeployedDemo){
        loadSampleTrip();
        return;
      }
    }catch(e){ /* ignore and fall back */ }
    // default for other contexts: demo POIs
    fetchDemoPois();
  })();

})();
