import React, { useEffect, useState, useCallback } from 'react';import React, { useEffect, useState, useCallback } from 'react';

import { BedDouble, Tent, Car, Info, Ship } from 'lucide-react';import { BedDouble, Tent, Car, Info, Ship } from 'lucide-react';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';

import L from 'leaflet';import L from 'leaflet';

import 'leaflet/dist/leaflet.css';import 'leaflet/dist/leaflet.css';



// Fix for default markers in Leaflet// Fix for default markers in Leaflet

delete L.Icon.Default.prototype._getIconUrl;delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({L.Icon.Default.mergeOptions({

  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',

  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',

  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',

});});



// Helper to get local discover image path for a location// Helper to get local discover image path for a location

function getLocalDiscoverImage(location) {function getLocalDiscoverImage(location) {

  if (!location) return null;  if (!location) return null;

  // Use the same sanitize logic as in download-discover-images.js  // Use the same sanitize logic as in download-discover-images.js

  // Always use Unsplash dynamic image URLs for map thumbnails (smaller size)  // Always use Unsplash dynamic image URLs for map thumbnails (smaller size)

  const q = encodeURIComponent((location || 'travel').split(',')[0]);  const q = encodeURIComponent((location || 'travel').split(',')[0]);

  return `https://source.unsplash.com/400x300/?${q}`;  return `https://source.unsplash.com/400x300/?${q}`;

}}



// Helper to get place name from location// Helper to get place name from location

function getPlaceName(location) {function getPlaceName(location) {

  if (!location) return '';  if (!location) return '';

  return location.split(',')[0];  return location.split(',')[0];

}}



// Icon by type for timeline// Icon by type for timeline

function getTypeIcon(type, item) {function getTypeIcon(type, item) {

  if (type === 'roofed') return <BedDouble className="w-5 h-5 text-indigo-600" title="Accommodation" />;  if (type === 'roofed') return <BedDouble className="w-5 h-5 text-indigo-600" title="Accommodation" />;

  if (type === 'camp') return <Tent className="w-5 h-5 text-green-600" title="Camping" />;  if (type === 'camp') return <Tent className="w-5 h-5 text-green-600" title="Camping" />;

  if (type === 'enroute') return <Car className="w-5 h-5 text-orange-500" title="Enroute" />;  if (type === 'enroute') return <Car className="w-5 h-5 text-orange-500" title="Enroute" />;

  if (type === 'note') return <Info className="w-5 h-5 text-purple-500" title="Note" />;  if (type === 'note') return <Info className="w-5 h-5 text-purple-500" title="Note" />;

  if (type === 'ferry' || (item && item.accommodation?.toLowerCase().includes('spirit'))) return <Ship className="w-5 h-5 text-blue-500" title="Ferry" />;  if (type === 'ferry' || (item && item.accommodation?.toLowerCase().includes('spirit'))) return <Ship className="w-5 h-5 text-blue-500" title="Ferry" />;

  if (type === 'car') return <Car className="w-5 h-5 text-gray-500" title="Car" />;  if (type === 'car') return <Car className="w-5 h-5 text-gray-500" title="Car" />;

  return null;  return null;

}}



// Geocode using Nominatim (OpenStreetMap)// Geocode using Nominatim (OpenStreetMap)

async function geocodeLocation(location) {async function geocodeLocation(location) {

  try {  try {

    console.log('Geocoding location:', location);    console.log('Geocoding location:', location);

    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`);    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`);

    const data = await response.json();    const data = await response.json();

    console.log('Geocoding response for', location, ':', data);    console.log('Geocoding response for', location, ':', data);

    if (data && data.length > 0) {    if (data && data.length > 0) {

      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };

    }    }

  } catch (error) {  } catch (error) {

    console.error('Geocoding failed:', error);    console.error('Geocoding failed:', error);

  }  }

  return null;  return null;

}}



// Get route using OSRM// Get route using OSRM

async function getRoute(coordinates) {async function getRoute(coordinates) {

  try {  try {

    const coords = coordinates.map(coord => `${coord.lng},${coord.lat}`).join(';');    const coords = coordinates.map(coord => `${coord.lng},${coord.lat}`).join(';');

    console.log('OSRM request URL:', `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);    console.log('OSRM request URL:', `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);

    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);

    console.log('OSRM response status:', response.status);    console.log('OSRM response status:', response.status);

    const data = await response.json();    const data = await response.json();

    console.log('OSRM response data:', data);    console.log('OSRM response data:', data);

    if (data.routes && data.routes.length > 0) {    if (data.routes && data.routes.length > 0) {

      return data.routes[0];      return data.routes[0];

    }    }

  } catch (error) {  } catch (error) {

    console.error('Routing failed:', error);    console.error('Routing failed:', error);

  }  }

  return null;  return null;

}}



// Create custom marker icon// Create custom marker icon

function createCustomIcon(type, isActive, scale = 1) {function createCustomIcon(type, isActive, scale = 1) {

  const size = 20 * scale;  const size = 20 * scale;

  const html = `  const html = `

    <div style="    <div style="

      width: ${size}px;      width: ${size}px;

      height: ${size}px;      height: ${size}px;

      border-radius: 50%;      border-radius: 50%;

      background-color: ${isActive ? '#f59e42' : type === 'roofed' || type === 'camp' ? '#2563eb' : type === 'enroute' ? '#f59e42' : '#4F46E5'};      background-color: ${isActive ? '#f59e42' : type === 'roofed' || type === 'camp' ? '#2563eb' : type === 'enroute' ? '#f59e42' : '#4F46E5'};

      border: 2px solid ${isActive ? '#f59e42' : 'white'};      border: 2px solid ${isActive ? '#f59e42' : 'white'};

      display: flex;      display: flex;

      align-items: center;      align-items: center;

      justify-content: center;      justify-content: center;

      color: white;      color: white;

      font-weight: bold;      font-weight: bold;

      font-size: ${12 * scale}px;      font-size: ${12 * scale}px;

    ">    ">

      ${type === 'roofed' ? '🏠' : type === 'camp' ? '⛺' : type === 'enroute' ? '🚗' : type === 'ferry' ? '🚢' : '📍'}      ${type === 'roofed' ? '🏠' : type === 'camp' ? '⛺' : type === 'enroute' ? '🚗' : type === 'ferry' ? '🚢' : '📍'}

    </div>    </div>

  `;  `;



  return L.divIcon({  return L.divIcon({

    html,    html,

    className: 'custom-marker',    className: 'custom-marker',

    iconSize: [size, size],    iconSize: [size, size],

    iconAnchor: [size/2, size/2]    iconAnchor: [size/2, size/2]

  });  });

}}



// Simplified Map component with Leaflet// Simplified Map component with Leaflet

function Map({ tripItems, onUpdateTravelTime, activeIndex, setActiveIndex }) {function Map({ tripItems, onUpdateTravelTime, activeIndex, setActiveIndex }) {

  const [markers, setMarkers] = useState([]);  const [markers, setMarkers] = useState([]);

  const [route, setRoute] = useState(null);  const [route, setRoute] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);  const [isProcessing, setIsProcessing] = useState(false);

  const [currentZoom, setCurrentZoom] = useState(7);  const [currentZoom, setCurrentZoom] = useState(7);

  const [accomNights, setAccomNights] = useState({});  const [accomNights, setAccomNights] = useState({});



  const sortedTripItems = Array.isArray(tripItems) ? tripItems.slice().sort((a, b) => (a?.date || '').localeCompare(b?.date || '')) : [];  const sortedTripItems = Array.isArray(tripItems) ? tripItems.slice().sort((a, b) => (a?.date || '').localeCompare(b?.date || '')) : [];



  const processLocations = useCallback(async () => {  const processLocations = useCallback(async () => {

    if (!sortedTripItems.length || isProcessing) return;    if (!sortedTripItems.length || isProcessing) return;

    setIsProcessing(true);    setIsProcessing(true);



    try {    try {

      const newMarkers = [];      const newMarkers = [];

      const coordinates = [];      const coordinates = [];

      const newAccomNights = {};      const newAccomNights = {};



      sortedTripItems.forEach(item => {      sortedTripItems.forEach(item => {

        if (item.type === 'roofed' || item.type === 'camp') {        if (item.type === 'roofed' || item.type === 'camp') {

          newAccomNights[item.location] = (newAccomNights[item.location] || 0) + (item.nights || 1);          newAccomNights[item.location] = (newAccomNights[item.location] || 0) + (item.nights || 1);

        }        }

      });      });



      setAccomNights(newAccomNights);      setAccomNights(newAccomNights);



      for (let i = 0; i < sortedTripItems.length; i++) {      for (let i = 0; i < sortedTripItems.length; i++) {

        const item = sortedTripItems[i];        const item = sortedTripItems[i];

        if (item.type === 'note') continue;        if (item.type === 'note') continue;



        const coords = await geocodeLocation(item.location);        const coords = await geocodeLocation(item.location);

        if (coords) {        if (coords) {

          coordinates.push(coords);          coordinates.push(coords);

          const scale = (item.type === 'roofed' || item.type === 'camp') ? 1 + 0.2 * (newAccomNights[item.location] - 1) : 0.8;          const scale = (item.type === 'roofed' || item.type === 'camp') ? 1 + 0.2 * (newAccomNights[item.location] - 1) : 0.8;

          const marker = {          const marker = {

            id: item.id,            id: item.id,

            position: coords,            position: coords,

            item,            item,

            index: i,            index: i,

            icon: createCustomIcon(item.type, activeIndex === i, scale)            icon: createCustomIcon(item.type, activeIndex === i, scale)

          };          };

          newMarkers.push(marker);          newMarkers.push(marker);



          if (onUpdateTravelTime) {          if (onUpdateTravelTime) {

            onUpdateTravelTime(item.id, item.travelTime || null, item.distance || null, coords);            onUpdateTravelTime(item.id, item.travelTime || null, item.distance || null, coords);

          }          }

        }        }

      }      }



      setMarkers(newMarkers);      setMarkers(newMarkers);



      // Get route if we have multiple coordinates      // Get route if we have multiple coordinates

      if (coordinates.length > 1) {      if (coordinates.length > 1) {

        console.log('Getting route for coordinates:', coordinates);        console.log('Getting route for coordinates:', coordinates);

        const routeData = await getRoute(coordinates);        const routeData = await getRoute(coordinates);

        console.log('Route data received:', routeData);        console.log('Route data received:', routeData);

        if (routeData) {        if (routeData) {

          const routeCoords = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert to [lat, lng]          const routeCoords = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert to [lat, lng]

          console.log('Converted route coordinates:', routeCoords.slice(0, 5), '...'); // Log first 5 points          console.log('Converted route coordinates:', routeCoords.slice(0, 5), '...'); // Log first 5 points

          setRoute(routeCoords);          setRoute(routeCoords);



          // Update travel times          // Update travel times

          if (onUpdateTravelTime && routeData.legs) {          if (onUpdateTravelTime && routeData.legs) {

            routeData.legs.forEach((leg, idx) => {            routeData.legs.forEach((leg, idx) => {

              const duration = `${Math.round(leg.duration / 60)} mins`;              const duration = `${Math.round(leg.duration / 60)} mins`;

              const distance = `${(leg.distance / 1000).toFixed(1)} km`;              const distance = `${(leg.distance / 1000).toFixed(1)} km`;

              const destinationIndex = idx + 1;              const destinationIndex = idx + 1;

              if (destinationIndex < newMarkers.length) {              if (destinationIndex < newMarkers.length) {

                const itemId = newMarkers[destinationIndex].id;                const itemId = newMarkers[destinationIndex].id;

                onUpdateTravelTime(itemId, duration, distance, null);                onUpdateTravelTime(itemId, duration, distance, null);

              }              }

            });            });

          }          }

        } else {        } else {

          console.log('No route data received from OSRM');          console.log('No route data received from OSRM');

        }        }

      } else {      } else {

        console.log('Not enough coordinates for routing:', coordinates.length);        console.log('Not enough coordinates for routing:', coordinates.length);

      }      }

    } catch (error) {    } catch (error) {

      console.error('Error processing locations:', error);      console.error('Error processing locations:', error);

    } finally {    } finally {

      setIsProcessing(false);      setIsProcessing(false);

    }    }

  }, [sortedTripItems, isProcessing, onUpdateTravelTime, activeIndex]);  }, [sortedTripItems, isProcessing, onUpdateTravelTime, activeIndex]);



  useEffect(() => {  useEffect(() => {

    processLocations();    processLocations();

  }, [processLocations]);  }, [processLocations]);



  const center = markers.length > 0  const center = markers.length > 0

    ? markers[0].position    ? markers[0].position

    : [-41.4545, 147.1595]; // Default to Tasmania    : [-41.4545, 147.1595]; // Default to Tasmania



  return (  return (

    <div className="relative">    <div className="relative">

      <MapContainer      <MapContainer

        center={center}        center={center}

        zoom={currentZoom}        zoom={currentZoom}

        style={{ height: '500px', width: '100%' }}        style={{ height: '500px', width: '100%' }}

        whenReady={() => setCurrentZoom(7)}        whenReady={() => setCurrentZoom(7)}

        onZoomEnd={(e) => setCurrentZoom(e.target.getZoom())}        onZoomEnd={(e) => setCurrentZoom(e.target.getZoom())}

      >      >

        <TileLayer        <TileLayer

          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

        />        />



        {markers.map((marker) => (        {markers.map((marker) => (

          <Marker          <Marker

            key={marker.id}            key={marker.id}

            position={marker.position}            position={marker.position}

            icon={marker.icon}            icon={marker.icon}

            eventHandlers={{            eventHandlers={{

              click: () => setActiveIndex && setActiveIndex(marker.index)              click: () => setActiveIndex && setActiveIndex(marker.index)

            }}            }}

          >          >

            <Popup>            <Popup>

              <div style={{ fontFamily: 'sans-serif' }}>              <div style={{ fontFamily: 'sans-serif' }}>

                <h3 style={{ margin: '0 0 8px 0', color: '#4F46E5' }}>                <h3 style={{ margin: '0 0 8px 0', color: '#4F46E5' }}>

                  {marker.item.location}                  {marker.item.location}

                </h3>                </h3>

                <p style={{ margin: 0, color: '#666' }}>                <p style={{ margin: 0, color: '#666' }}>

                  <strong>Date:</strong> {marker.item.date}                  <strong>Date:</strong> {marker.item.date}

                </p>                </p>

                <p style={{ margin: 0, color: '#666' }}>                <p style={{ margin: 0, color: '#666' }}>

                  <strong>Stay:</strong> {marker.item.accommodation || ''}                  <strong>Stay:</strong> {marker.item.accommodation || ''}

                </p>                </p>

                {(marker.item.type === 'roofed' || marker.item.type === 'camp') && (                {(marker.item.type === 'roofed' || marker.item.type === 'camp') && (

                  <p style={{ margin: 0, color: '#2563eb' }}>                  <p style={{ margin: 0, color: '#2563eb' }}>

                    <strong>Nights:</strong> {accomNights[marker.item.location]}                    <strong>Nights:</strong> {accomNights[marker.item.location]}

                  </p>                  </p>

                )}                )}

              </div>              </div>

            </Popup>            </Popup>

          </Marker>          </Marker>

        ))}        ))}



        {route && (        {route && (

          <Polyline          <Polyline

            positions={route}            positions={route}

            color="#4F46E5"            color="#4F46E5"

            weight={4}            weight={4}

            opacity={0.8}            opacity={0.8}

          />          />

        )}        )}

        {route && console.log('Rendering route with positions:', route.slice(0, 3), '...')}        {route && console.log('Rendering route with positions:', route.slice(0, 3), '...')}

      </MapContainer>      </MapContainer>



      {isProcessing && (      {isProcessing && (

        <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm z-1000">        <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm z-1000">

          Processing locations...          Processing locations...

        </div>        </div>

      )}      )}

    </div>    </div>

  );  );

}}

  useEffect(() => {

// Main TripMap component    if (ref.current && !map && window.google) {

function TripMap({ tripItems, loadingInitialData, onUpdateTravelTime }) {      const newMap = new window.google.maps.Map(ref.current, {

  const [activeIndex, setActiveIndex] = useState(null);        center: { lat: -41.4545, lng: 147.1595 },

  // Track per-item image indexes in a single state object to avoid hooks-in-loops        zoom: 7,

  const [imageIndexes, setImageIndexes] = useState({});        mapTypeId: 'roadmap',

        gestureHandling: 'cooperative',

  // Filter out "note" type items from mapping and sort by date for consistent ordering        zoomControl: true,

  const mappableItems = tripItems.filter(item => item.type !== 'note');        mapTypeControl: false,

  const sortedMappableItems = Array.isArray(mappableItems) ? mappableItems.slice().sort((a, b) => (a?.date || '').localeCompare(b?.date || '')) : [];        scaleControl: true,

        streetViewControl: false,

  if (loadingInitialData) {        rotateControl: false,

    return (        fullscreenControl: true

      <div className="flex justify-center items-center h-64">      });

        <div className="text-indigo-700 text-xl">Loading trip data...</div>      setMap(newMap);

      </div>      newMap.addListener('zoom_changed', () => setCurrentZoom(newMap.getZoom()));

    );    }

  }  }, [ref, map]);



  if (mappableItems.length === 0) {  const sortedTripItems = Array.isArray(tripItems) ? tripItems.slice().sort((a, b) => (a?.date || '').localeCompare(b?.date || '')) : [];

    return (

      <div className="text-center text-gray-500 py-8">  const processLocations = useCallback(async () => {

        <p className="text-xl mb-4">No mappable locations to display</p>    if (!map || !sortedTripItems.length || isProcessing) return;

        {tripItems.length > 0 ? (    setIsProcessing(true);

          <p>Your trip items are notes only. Add locations with type 'Roofed', 'Camp', or 'Enroute' to see them on the map!</p>

        ) : (    try {

          <p>Add some trip items with locations to see them on the map!</p>      const geocoder = new window.google.maps.Geocoder();

        )}      const directionsService = new window.google.maps.DirectionsService();

      </div>      const directionsRenderer = new window.google.maps.DirectionsRenderer({ suppressMarkers: true, polylineOptions: { strokeColor: '#4F46E5', strokeWeight: 4, strokeOpacity: 0.8 } });

    );      directionsRenderer.setMap(map);

  }

      const bounds = new window.google.maps.LatLngBounds();

  return (      const markers = [];

    <div className="w-full">      const validLocations = [];

      <div className="mb-4">

        <h3 className="text-xl font-semibold text-indigo-700 mb-2">Trip Route Map</h3>      const accomNights = {};

        <p className="text-gray-600 text-sm flex flex-wrap gap-1 items-center">      sortedTripItems.forEach(item => {

          {mappableItems.length === 1        if (item.type === 'roofed' || item.type === 'camp') {

            ? <>          accomNights[item.location] = (accomNights[item.location] || 0) + (item.nights || 1);

                Showing location: <span>{getPlaceName(mappableItems[0].location)}</span>        }

              </>      });

            : <>

                Route through {mappableItems.length} locations: {      const showEnroute = currentZoom >= 9;

                  mappableItems.map((item, idx) => {

                    let color = 'text-gray-700';      for (let i = 0; i < sortedTripItems.length; i++) {

                    let font = '';        const item = sortedTripItems[i];

                    if (item.type === 'roofed') { color = 'text-indigo-700'; font = 'font-bold'; }        // Always include enroute items in routing calculations so we can compute travelTime/distance,

                    else if (item.type === 'camp') { color = 'text-green-700'; font = 'font-bold'; }        // but suppress visible markers for enroute items when zoom is low.

                    else if (item.type === 'enroute') color = 'text-orange-600';        if (item.type === 'note') continue;

                    else if (item.type === 'note') color = 'text-purple-600';        try {

                    else if (item.type === 'ferry') color = 'text-blue-600';          const results = await new Promise((resolve, reject) => {

                    return <span key={item.id} className={`${color} ${font}`}>{getPlaceName(item.location)}{idx < mappableItems.length-1 && <span className="text-gray-400"> → </span>}</span>;            geocoder.geocode({ address: item.location }, (results, status) => status === 'OK' ? resolve(results) : reject(new Error(`Geocoding failed for ${item.location}: ${status}`)));

                  })          });

                }          if (results && results[0]) {

              </>            const position = results[0].geometry.location;

          }            let scale = 12;

          {tripItems.length > mappableItems.length &&            let fillColor = '#4F46E5';

            <span className="text-gray-400">({tripItems.length - mappableItems.length} note items excluded from map)</span>            let strokeColor = 'white';

          }            if (item.type === 'roofed' || item.type === 'camp') {

        </p>              scale = 12 + 4 * (accomNights[item.location] - 1);

        <p className="text-blue-600 text-xs mt-1">              fillColor = '#2563eb'; strokeColor = '#1e293b';

          💡 Travel times will be automatically calculated and updated based on OpenStreetMap routing data            } else if (item.type === 'enroute') {

        </p>              scale = 8; fillColor = '#f59e42'; strokeColor = '#fbbf24';

      </div>            }

            if (activeIndex === i) { fillColor = '#f59e42'; strokeColor = '#f59e42'; }

      <div className="border rounded-lg overflow-hidden shadow-lg">            const labelIndex = (typeof item.displayIndex === 'number') ? item.displayIndex : (i + 1);

        <Map tripItems={sortedMappableItems} onUpdateTravelTime={onUpdateTravelTime} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />            const createMarker = !(item.type === 'enroute' && !showEnroute);

      </div>            const markerOpts = { position, title: `${labelIndex}. ${item.location}`, label: { text: String(labelIndex), color: 'white', fontWeight: 'bold' }, icon: { path: window.google.maps.SymbolPath.CIRCLE, scale, fillColor, fillOpacity: 1, strokeColor, strokeWeight: 2 }, zIndex: activeIndex === i ? 999 : 1 };

            const marker = createMarker ? new window.google.maps.Marker({ ...markerOpts, map }) : new window.google.maps.Marker({ ...markerOpts, visible: false });

      {/* Scrollable mini-timeline */}            const infoWindow = new window.google.maps.InfoWindow({ content: `<div style="font-family: sans-serif;"><h3 style="margin: 0 0 8px 0; color: #4F46E5;">${item.location}</h3><p style="margin: 0; color: #666;"><strong>Date:</strong> ${item.date}</p><p style="margin: 0; color: #666;"><strong>Stay:</strong> ${item.accommodation || ''}</p>${(item.type === 'roofed' || item.type === 'camp') ? `<p style='margin:0;color:#2563eb;'><strong>Nights:</strong> ${accomNights[item.location]}</p>` : ''}</div>` });

      <div className="mt-4">            marker.addListener('click', () => { infoWindow.open(map, marker); setActiveIndex && setActiveIndex(i); });

        <h4 className="text-lg font-semibold text-indigo-700 mb-2">Trip Timeline</h4>            markers.push(marker); bounds.extend(position); validLocations.push(item.location);

        <div className="flex flex-wrap gap-3 pb-2">            // report coordinates back to parent so they can be persisted/staged

          {sortedMappableItems.map((item, index) => {            if (onUpdateTravelTime) {

            const isActive = activeIndex === index;              const coords = { lat: position.lat(), lng: position.lng() };

            const displayIndex = index + 1;              // duration/distance unknown here; only coords

            const imgIdx = imageIndexes[item.id] || 0;              onUpdateTravelTime(item.id, item.travelTime || null, item.distance || null, coords);

            const images = Array.isArray(item.discoverImages) ? item.discoverImages : [getLocalDiscoverImage(item.location)];            }

            const showPrev = images.length > 1;            await new Promise(r => setTimeout(r, 100));

            const showNext = images.length > 1;          }

            const handlePrev = (e) => {        } catch (e) {

              e.stopPropagation();          console.error(`✗ Failed to geocode: ${item.location}`, e);

              setImageIndexes(idxes => ({ ...idxes, [item.id]: ((idxes[item.id] || 0) - 1 + images.length) % images.length }));        }

            };      }

            const handleNext = (e) => {

              e.stopPropagation();      if (markers.length > 0) {

              setImageIndexes(idxes => ({ ...idxes, [item.id]: ((idxes[item.id] || 0) + 1) % images.length }));        map.fitBounds(bounds);

            };        if (markers.length === 1) map.setZoom(12);

            return (      }

              <button

                key={item.id}      if (validLocations.length > 1) {

                className={`flex flex-col items-center w-[90px] px-2 py-2 rounded-lg border transition-all duration-150 focus:outline-none ${        try {

                  isActive ? 'border-orange-400 bg-orange-50 shadow' : 'border-gray-200 bg-gray-50'          const waypoints = validLocations.slice(1, -1).map(location => ({ location, stopover: true }));

                }`}          const request = { origin: validLocations[0], destination: validLocations[validLocations.length - 1], waypoints, travelMode: window.google.maps.TravelMode.DRIVING, unitSystem: window.google.maps.UnitSystem.METRIC };

                onClick={() => setActiveIndex(index)}          const result = await new Promise((resolve, reject) => directionsService.route(request, (res, status) => status === 'OK' ? resolve(res) : reject(new Error(`Directions failed: ${status}`))));

                style={{ cursor: 'pointer' }}          directionsRenderer.setDirections(result);

              >          if (result.routes[0] && result.routes[0].legs && onUpdateTravelTime) {

                <span className="mb-1 relative block w-10 h-10 rounded-full overflow-hidden bg-gray-100" style={{marginBottom: 4}}>            const legs = result.routes[0].legs;

                  {/* Cycling discover images */}            for (let i = 0; i < legs.length; i++) {

                  <img              const leg = legs[i];

                    src={images[imgIdx]}              const duration = leg.duration.text;

                    alt={getPlaceName(item.location)}              const distance = leg.distance.text;

                    className="object-cover w-full h-full"              const destinationLocation = validLocations[i + 1];

                    onError={e => { e.target.style.display = 'none'; }}              const tripItem = sortedTripItems.find(item => item.location === destinationLocation);

                  />              if (tripItem) onUpdateTravelTime(tripItem.id, duration, distance, null);

                  <span className="absolute inset-0 flex items-center justify-center">            }

                    {getTypeIcon(item.type, item)}          }

                  </span>        } catch (e) {

                  <span className="absolute -top-2 -left-2 bg-indigo-600 text-white text-[10px] font-semibold rounded-full w-6 h-6 flex items-center justify-center">{displayIndex}</span>          console.log('ℹ Directions not available, showing markers only:', e.message);

                  {showPrev && (        }

                    <button type="button" className="absolute left-0 top-1/2 -translate-y-1/2 bg-white bg-opacity-60 rounded-full px-1 text-xs" onClick={handlePrev}>&lt;</button>      }

                  )}    } catch (error) {

                  {showNext && (      console.error('Error processing locations:', error);

                    <button type="button" className="absolute right-0 top-1/2 -translate-y-1/2 bg-white bg-opacity-60 rounded-full px-1 text-xs" onClick={handleNext}>&gt;</button>    } finally {

                  )}      setIsProcessing(false);

                </span>    }

                <span className="font-semibold text-gray-800 text-xs truncate max-w-[70px]">{getPlaceName(item.location)}</span>  }, [map, sortedTripItems, isProcessing, onUpdateTravelTime, activeIndex, currentZoom, setActiveIndex]);

                {(item.travelTime || item.distance) && (

                  <span className="text-[10px] text-gray-500 mt-1 text-center">  useEffect(() => {

                    {item.travelTime}{item.travelTime && item.distance ? ' • ' : ''}{item.distance}    if (!map || !sortedTripItems.length) return;

                  </span>    const currentDataKey = JSON.stringify(sortedTripItems.map(item => ({ id: item.id, location: item.location })));

                )}    if (lastProcessedData === currentDataKey) return;

              </button>    const timer = setTimeout(() => { setLastProcessedData(currentDataKey); processLocations(); }, 1000);

            );    return () => clearTimeout(timer);

          })}  }, [map, sortedTripItems, processLocations, lastProcessedData]);

        </div>

      </div>  return (

    </div>    <div className="relative">

  );      <div ref={ref} style={{ width: '100%', height: '500px' }} />

}      {isProcessing && (

        <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">Processing locations...</div>

export default TripMap;      )}
    </div>
  );
}

// Main TripMap component
function TripMap({ tripItems, loadingInitialData, onUpdateTravelTime }) {
  const [activeIndex, setActiveIndex] = useState(null);
  // Track per-item image indexes in a single state object to avoid hooks-in-loops
  const [imageIndexes, setImageIndexes] = useState({});
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  // Filter out "note" type items from mapping and sort by date for consistent ordering
  const mappableItems = tripItems.filter(item => item.type !== 'note');
  const sortedMappableItems = Array.isArray(mappableItems) ? mappableItems.slice().sort((a, b) => (a?.date || '').localeCompare(b?.date || '')) : [];

  if (loadingInitialData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-indigo-700 text-xl">Loading trip data...</div>
      </div>
    );
  }

  const noApiKey = !apiKey;
  // When no API key is present, show a prominent banner but continue to render the timeline so
  // numbers and any persisted travel times are visible for verification. Map features (geocoding
  // and directions) will be inactive without an API key.

  if (mappableItems.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-xl mb-4">No mappable locations to display</p>
        {tripItems.length > 0 ? (
          <p>Your trip items are notes only. Add locations with type 'Roofed', 'Camp', or 'Enroute' to see them on the map!</p>
        ) : (
          <p>Add some trip items with locations to see them on the map!</p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-indigo-700 mb-2">Trip Route Map</h3>
        <p className="text-gray-600 text-sm flex flex-wrap gap-1 items-center">
          {mappableItems.length === 1 
            ? <>
                Showing location: <span>{getPlaceName(mappableItems[0].location)}</span>
              </>
            : <>
                Route through {mappableItems.length} locations: {
                  mappableItems.map((item, idx) => {
                    let color = 'text-gray-700';
                    let font = '';
                    if (item.type === 'roofed') { color = 'text-indigo-700'; font = 'font-bold'; }
                    else if (item.type === 'camp') { color = 'text-green-700'; font = 'font-bold'; }
                    else if (item.type === 'enroute') color = 'text-orange-600';
                    else if (item.type === 'note') color = 'text-purple-600';
                    else if (item.type === 'ferry') color = 'text-blue-600';
                    return <span key={item.id} className={`${color} ${font}`}>{getPlaceName(item.location)}{idx < mappableItems.length-1 && <span className="text-gray-400"> → </span>}</span>;
                  })
                }
              </>
          }
          {tripItems.length > mappableItems.length && 
            <span className="text-gray-400">({tripItems.length - mappableItems.length} note items excluded from map)</span>
          }
        </p>
        <p className="text-blue-600 text-xs mt-1">
          💡 Travel times will be automatically calculated and updated based on Google Maps routing data
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-lg">
        <Wrapper 
          apiKey={apiKey} 
          render={render}
          libraries={['geometry']}
        >
          <Map tripItems={sortedMappableItems} onUpdateTravelTime={onUpdateTravelTime} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
        </Wrapper>
      </div>

      {/* Scrollable mini-timeline */}
      <div className="mt-4">
        <h4 className="text-lg font-semibold text-indigo-700 mb-2">Trip Timeline</h4>
           <div className="flex flex-wrap gap-3 pb-2">
      {sortedMappableItems.map((item, index) => {
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
        <button
          key={item.id}
          className={`flex flex-col items-center w-[90px] px-2 py-2 rounded-lg border transition-all duration-150 focus:outline-none ${
            isActive ? 'border-orange-400 bg-orange-50 shadow' : 'border-gray-200 bg-gray-50'
          }`}
                   onClick={() => setActiveIndex(index)}
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
            <span className="absolute -top-2 -left-2 bg-indigo-600 text-white text-[10px] font-semibold rounded-full w-6 h-6 flex items-center justify-center">{displayIndex}</span>
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
        </button>
      );
    })}
        </div>
      </div>
    </div>
  );
}

export default TripMap;
