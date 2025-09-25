/* smoke-embed-test-jsdom.js
 * Lightweight smoke test using jsdom to load built openpoimap-lite.html and openpoimap-lite.js
 * It will dispatch postMessage events for syncTrip and flyToLocation and capture posted responses.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function run(){
  const buildDir = path.resolve(__dirname, '..', 'build');
  const htmlPath = path.join(buildDir, 'openpoimap-lite.html');
  const jsPath = path.join(buildDir, 'openpoimap-lite.js');
  if(!fs.existsSync(htmlPath) || !fs.existsSync(jsPath)){
    console.error('Built files not found in build/. Run npm run build first.');
    process.exit(2);
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const script = fs.readFileSync(jsPath, 'utf8');

  const dom = new JSDOM(html, { runScripts: 'outside-only', resources: 'usable', pretendToBeVisual: true });
  const { window } = dom;

  // Provide a minimal Leaflet stub so the script can attach handlers. We'll implement only the methods used in the embed handler path we exercise.
  const leafletStub = createLeafletStub(window);
  window.L = leafletStub;

  // Set up a message collector
  const collected = [];
  window.addEventListener('message', (ev)=>{ collected.push(ev.data); });

  // evaluate the script in the window
  try{
    window.eval(script);
  }catch(e){ console.error('Script evaluation failed', e); process.exit(3); }

  // dispatch a syncTrip message: one numeric coordinate and one textual location
  const trip = { tripId: 'jsdom-test-1', items: [ { id:'a', title:'A', lat: -33.8568, lng: 151.2153 }, { id:'b', title:'B', location: 'Eiffel Tower, Paris' } ] };
  window.postMessage({ type: 'syncTrip', payload: trip }, '*');

  // Allow some time for internal async geocoding (the embed uses fetch to Nominatim; we will stub global.fetch to return a canned response for Eiffel Tower)
  global.fetch = async function(url){
    if(url && url.indexOf('nominatim.openstreetmap.org') !== -1){
      return { json: async ()=> [{ lat: '48.8582602', lon: '2.2944991', display_name: 'Eiffel Tower, Paris' }] };
    }
    return { json: async ()=> ({}) };
  };

  // wait a bit for the handlers to run
  await new Promise(r=>setTimeout(r, 500));

  // dispatch flyToLocation
  window.postMessage({ type: 'flyToLocation', payload: { location: 'Sydney Opera House' } }, '*');

  // For the geocode call, stub a response
  global.fetch = async function(url){
    if(url && url.indexOf('nominatim.openstreetmap.org') !== -1){
      if(url.indexOf('Sydney') !== -1 || url.indexOf('Opera') !== -1) return { json: async ()=> [{ lat: '-33.8567844', lon: '151.2152967', display_name: 'Sydney Opera House' }] };
      return { json: async ()=> [{ lat: '48.8582602', lon: '2.2944991', display_name: 'Eiffel Tower, Paris' }] };
    }
    return { json: async ()=> ({}) };
  };

  await new Promise(r=>setTimeout(r, 500));

  console.log('Collected messages:', collected);

  const hasSyncAck = collected.some(m=>m && m.type === 'syncAck');
  const hasFlyAck = collected.some(m=>m && m.type === 'flyAck');
  if(!hasSyncAck){ console.error('Missing syncAck'); process.exit(4); }
  if(!hasFlyAck){ console.error('Missing flyAck'); process.exit(5); }
  console.log('jsdom smoke test passed.');
  process.exit(0);
}

function createLeafletStub(window){
  // Minimal methods used by the embed: L.map(...), L.tileLayer(...), L.marker(...), L.polyline(...), L.latLngBounds, L.layerGroup, L.markerClusterGroup
  const L = {};
  L.map = function(id, opts){
    const el = window.document.getElementById(id) || { style:{} };
    return {
      _center: opts && opts.center ? opts.center : [0,0],
      _zoom: opts && opts.zoom ? opts.zoom : 4,
      setView: function(c,z){ this._center=c; this._zoom=z; },
      flyTo: function(c,z,opts){ this._center=c; this._zoom=z; },
      getCenter: function(){ return { lat: this._center[0], lng: this._center[1] }; },
      fitBounds: function(){},
      removeLayer: function(){},
      addLayer: function(){},
      on: function(){},
      off: function(){},
      whenReady: function(cb){ try{ cb(); }catch(e){} },
    };
  };
  L.tileLayer = function(){ return { addTo: function(){}, remove: function(){}}; };
  L.marker = function(latlng){ return { addTo: function(){}, bindPopup: function(){}, on: function(){}, }; };
  L.polyline = function(){ return { addTo: function(){}, getBounds: function(){ return { pad: function(){ return { pad: function(){ return {}} } } } } }; };
  L.latLngBounds = function(){ return { pad: function(){ return { } } }; };
  L.layerGroup = function(){ const obj = { addLayer: function(){}, removeLayer: function(){}, clearLayers: function(){}, eachLayer: function(){}, getLayers: function(){ return []; } }; obj.addTo = function(){ return obj; }; return obj; };
  L.markerClusterGroup = function(){ const obj = { addTo: function(){}, clearLayers: function(){}, getLayers: function(){ return []; }, on: function(){}, }; obj.addTo = function(){ return obj; }; return obj; };
  L.divIcon = function(){ return {}; };
  return L;
}

run().catch(err=>{ console.error(err); process.exit(99); });
