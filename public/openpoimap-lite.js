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

  // --- Sample trip loader (fetches sample-trip.json) ---
  async function loadSampleTrip(){
    try{
      const resp = await fetch('/sample-trip.json');
      const sample = await resp.json();
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
      for(const n of normalized){
        try{
          logStatus('Geocoding: '+n.location);
          const g = await geocodeLocation(n.location);
          if(g){ logStatus(`✓ ${n.location} → ${g.lat.toFixed(5)},${g.lng.toFixed(5)}`); routePoints.push({ label: n.title || n.location, lat: g.lat, lng: g.lng, display_name: g.display_name }); bounds.extend([g.lat,g.lng]); refreshRouteList(); }
          else { logStatus('✗ geocode miss for '+n.location); console.warn('Geocode miss for', n.location); }
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
  if(routePoints.length>1){ logStatus('Requesting route from OSRM for '+routePoints.length+' points...'); const r = await getRouteOSRM(routePoints); if(r){ logStatus('✓ route received — drawing'); renderRoute(r.geometry, routePoints); try{ map.fitBounds(L.polyline(r.geometry.coordinates.map(c=>[c[1],c[0]])).getBounds().pad(0.15)); }catch(e){} } else { logStatus('✗ routing failed'); document.getElementById('poiStatus').textContent += ' • routing failed'; } }
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
  // Auto-load Paris sample trip when ?owner=<ownerId> or ?trip=paris is present in the URL
  (function(){
    try{
      const params = new URLSearchParams(window.location.search);
      const owner = params.get('owner');
      const trip = params.get('trip');
      const AUTO_OWNER = 'Yc1vLpmyYXg8PLGJKLaYUDdbwHI3';
      if(owner === AUTO_OWNER || trip === 'paris'){
        // load the sample-trip.json (Paris) and compute routing/waypoints automatically
        loadSampleTrip();
        return;
      }
    }catch(e){ /* ignore and fall back */ }
    // default: demo POIs
    fetchDemoPois();
  })();

})();
