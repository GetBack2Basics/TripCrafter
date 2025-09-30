import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';

// Minimal React wrapper implementing an OpenPoiMap-like lite map
export default function OpenPoiMapLite({ tripItems = [], currentTripId, onAddItem, onOpenEdit, setFlyHandler }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const clustersRef = useRef(new Map());
  const allClustersRef = useRef(null);
  const [base, setBase] = useState('osm');
  const geocodeCache = useRef({});

  // Basic group map (subset) — keep small for performance
  const groupMap = {
    tourism: ['museum','viewpoint','artwork','gallery','attraction','zoo','theme_park','tourism','information','viewpoint'],
    hotels: ['hotel','guest_house','hostel','motel','bed_and_breakfast','camp_site']
  };

  useEffect(() => {
    if (!containerRef.current) return;
    // create map
    const map = L.map(containerRef.current, { center: [-41.4545, 147.1595], zoom: 7, zoomControl: false });
    mapRef.current = map;

    const layers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '© OpenTopoMap contributors' })
    };
    layers[base].addTo(map);

    // add simple controls in DOM (zoom/reset)
    const zoomIn = L.control({ position: 'topright' });
    zoomIn.onAdd = function() {
      const el = L.DomUtil.create('div', 'openpoimap-lite-controls');
      el.style.background = 'white'; el.style.padding = '6px'; el.style.borderRadius = '6px'; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
      el.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px"><button id=opl-zoom-in style='width:36px;height:28px'>+</button><button id=opl-zoom-out style='width:36px;height:28px'>−</button><button id=opl-reset style='width:36px;height:28px'>⤾</button></div>`;
      return el;
    };
    zoomIn.addTo(map);

    // cluster container
    allClustersRef.current = L.layerGroup().addTo(map);

    // expose simple api for parent: flyTo
    if (typeof setFlyHandler === 'function') {
      setFlyHandler(async (lat, lng, zoom) => {
        try { map.flyTo([lat, lng], zoom || Math.max(map.getZoom(), 12), { duration: 0.6 }); return true; } catch (e) { try { map.setView([lat, lng], zoom || map.getZoom()); return true; } catch (err) { return false; } }
      });
    }

    // attach button handlers (use event delegation safe with Leaflet container)
    const rootEl = containerRef.current;
    const onClick = (ev) => {
      const t = ev.target;
      if (t && t.id === 'opl-zoom-in') { map.zoomIn(); }
      if (t && t.id === 'opl-zoom-out') { map.zoomOut(); }
      if (t && t.id === 'opl-reset') { map.setView([-41.4545, 147.1595], 7); }
    };
    rootEl.addEventListener('click', onClick);

    return () => {
      try { rootEl.removeEventListener('click', onClick); } catch (e) {}
      try { map.remove(); } catch (e) {}
    };
  }, []);

  // create or get cluster group by tag
  const getOrCreateCluster = (tag) => {
    const key = tag || '__generic__';
    if (clustersRef.current.has(key)) return clustersRef.current.get(key);
    const cl = L.markerClusterGroup({ chunkedLoading: true });
    clustersRef.current.set(key, cl);
    try { allClustersRef.current.addLayer(cl); } catch (e) {}
    return cl;
  };

  // geocode helper (simple, cached)
  const geocode = async (q) => {
    if (!q) return null;
    if (geocodeCache.current[q]) return geocodeCache.current[q];
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const data = await resp.json();
      if (data && data.length) { const c = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name }; geocodeCache.current[q] = c; return c; }
    } catch (e) {}
    return null;
  };

  // sync trip items to map markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // clear existing cluster layers
    clustersRef.current.forEach((cl) => { try { cl.clearLayers(); } catch (e) {} });

    let mounted = true;
    (async () => {
      const pts = [];
      for (const item of tripItems || []) {
        try {
          let latlng = null;
          if (item.lat && item.lng) latlng = { lat: Number(item.lat), lng: Number(item.lng) };
          else {
            const g = await geocode(item.location || item.display_name || item.title || '');
            if (g) latlng = { lat: g.lat, lng: g.lng };
          }
          if (!latlng) continue;
          pts.push({ item, latlng });
        } catch (e) { continue; }
      }

      if (!mounted) return;
      // add markers
      for (const p of pts) {
        const mk = L.marker([p.latlng.lat, p.latlng.lng]);
        const content = document.createElement('div');
        content.style.fontFamily = 'sans-serif';
        const title = document.createElement('div'); title.style.fontWeight = '700'; title.textContent = p.item.title || p.item.location || 'Waypoint';
        const meta = document.createElement('div'); meta.style.fontSize = '12px'; meta.style.color = '#666'; meta.textContent = p.item.date || '';
        const btns = document.createElement('div'); btns.style.marginTop = '6px';
        const edit = document.createElement('button'); edit.textContent = 'Edit'; edit.style.marginRight = '6px';
        edit.onclick = (ev) => { ev && ev.preventDefault && ev.preventDefault(); try { if (typeof onOpenEdit === 'function') onOpenEdit(p.item); else if (window.openTripFormForEdit) window.openTripFormForEdit(p.item); } catch (e) {} };
        btns.appendChild(edit);
        content.appendChild(title); content.appendChild(meta); content.appendChild(btns);
        mk.bindPopup(content);
        // add to cluster group for tourism else generic
        const tag = (p.item.type && String(p.item.type)) || '__generic__';
        const cl = getOrCreateCluster(tag);
        try { cl.addLayer(mk); } catch (e) { try { map.addLayer(mk); } catch (err) {} }
      }

      // fit to bounds if we have points
      try {
        const all = [];
        clustersRef.current.forEach((cl) => { try { cl.eachLayer(l => all.push(l.getLatLng())); } catch (e) {} });
        if (all.length > 0) {
          const b = L.latLngBounds(all);
          map.fitBounds(b.pad(0.2));
        }
      } catch (e) {}
    })();

    return () => { mounted = false; };
  }, [tripItems, currentTripId]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '500px' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1400 }}>
        <div style={{ background: 'white', padding: 8, borderRadius: 6, boxShadow: '0 1px 6px rgba(0,0,0,0.12)' }}>
          <div style={{ marginBottom: 6, fontWeight: 700 }}>Base</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <label><input type="radio" name="opl-base" checked={base==='osm'} onChange={() => { setBase('osm'); const map = mapRef.current; if (map) { map.eachLayer(l => { if (l && l.options && l.options.attribution) map.removeLayer(l); }); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map); } }} /> OSM</label>
            <label><input type="radio" name="opl-base" checked={base==='topo'} onChange={() => { setBase('topo'); const map = mapRef.current; if (map) { map.eachLayer(l => { if (l && l.options && l.options.attribution) map.removeLayer(l); } ); L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png').addTo(map); } }} /> Topo</label>
          </div>
        </div>
      </div>
    </div>
  );
}
