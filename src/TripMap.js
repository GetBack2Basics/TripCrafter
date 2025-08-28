import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BedDouble, Tent, Car, Info, Ship } from 'lucide-react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

// Helper to get local discover image path for a location
function getLocalDiscoverImage(location) {
  if (!location) return null;
  // Use the same sanitize logic as in download-discover-images.js
  // Always use Unsplash dynamic image URLs for map thumbnails (smaller size)
  const q = encodeURIComponent((location || 'travel').split(',')[0]);
  return `https://source.unsplash.com/400x300/?${q}`;
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

const render = (status) => {
  switch (status) {
    case Status.LOADING:
      return <div className="flex justify-center items-center h-64">Loading Google Maps...</div>;
    case Status.FAILURE:
      return <div className="flex justify-center items-center h-64 text-red-500">Error loading Google Maps. Please check your API key.</div>;
    case Status.SUCCESS:
      return null;
    default:
      return <div className="flex justify-center items-center h-64">Initializing map...</div>;
  }
};

// Simplified Map component with better performance and travel time calculation
function getPlaceName(location) {
  if (!location) return '';
  return location.split(',')[0];
}

function Map({ tripItems, onUpdateTravelTime, activeIndex, setActiveIndex }) {
  const ref = useRef(null);
  const [map, setMap] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedData, setLastProcessedData] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(7);

  // Initialize map only once
  useEffect(() => {
    if (ref.current && !map && window.google) {
      const newMap = new window.google.maps.Map(ref.current, {
        center: { lat: -41.4545, lng: 147.1595 },
        zoom: 7,
        mapTypeId: 'roadmap',
        gestureHandling: 'cooperative',
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true
      });
      setMap(newMap);
      newMap.addListener('zoom_changed', () => setCurrentZoom(newMap.getZoom()));
    }
  }, [ref, map]);

  const sortedTripItems = Array.isArray(tripItems) ? tripItems.slice().sort((a, b) => (a?.date || '').localeCompare(b?.date || '')) : [];

  const processLocations = useCallback(async () => {
    if (!map || !sortedTripItems.length || isProcessing) return;
    setIsProcessing(true);

    try {
      const geocoder = new window.google.maps.Geocoder();
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({ suppressMarkers: true, polylineOptions: { strokeColor: '#4F46E5', strokeWeight: 4, strokeOpacity: 0.8 } });
      directionsRenderer.setMap(map);

      const bounds = new window.google.maps.LatLngBounds();
      const markers = [];
      const validLocations = [];

      const accomNights = {};
      sortedTripItems.forEach(item => {
        if (item.type === 'roofed' || item.type === 'camp') {
          accomNights[item.location] = (accomNights[item.location] || 0) + (item.nights || 1);
        }
      });

      const showEnroute = currentZoom >= 9;

      for (let i = 0; i < sortedTripItems.length; i++) {
        const item = sortedTripItems[i];
        if (item.type === 'enroute' && !showEnroute) continue;
        if (item.type === 'note') continue;
        try {
          const results = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: item.location }, (results, status) => status === 'OK' ? resolve(results) : reject(new Error(`Geocoding failed for ${item.location}: ${status}`)));
          });
          if (results && results[0]) {
            const position = results[0].geometry.location;
            let scale = 12;
            let fillColor = '#4F46E5';
            let strokeColor = 'white';
            if (item.type === 'roofed' || item.type === 'camp') {
              scale = 12 + 4 * (accomNights[item.location] - 1);
              fillColor = '#2563eb'; strokeColor = '#1e293b';
            } else if (item.type === 'enroute') {
              scale = 8; fillColor = '#f59e42'; strokeColor = '#fbbf24';
            }
            if (activeIndex === i) { fillColor = '#f59e42'; strokeColor = '#f59e42'; }
            const marker = new window.google.maps.Marker({ position, map, title: `${i + 1}. ${item.location}`, label: { text: (i + 1).toString(), color: 'white', fontWeight: 'bold' }, icon: { path: window.google.maps.SymbolPath.CIRCLE, scale, fillColor, fillOpacity: 1, strokeColor, strokeWeight: 2 }, zIndex: activeIndex === i ? 999 : 1 });
            const infoWindow = new window.google.maps.InfoWindow({ content: `<div style="font-family: sans-serif;"><h3 style="margin: 0 0 8px 0; color: #4F46E5;">${item.location}</h3><p style="margin: 0; color: #666;"><strong>Date:</strong> ${item.date}</p><p style="margin: 0; color: #666;"><strong>Stay:</strong> ${item.accommodation || ''}</p>${(item.type === 'roofed' || item.type === 'camp') ? `<p style='margin:0;color:#2563eb;'><strong>Nights:</strong> ${accomNights[item.location]}</p>` : ''}</div>` });
            marker.addListener('click', () => { infoWindow.open(map, marker); setActiveIndex && setActiveIndex(i); });
            markers.push(marker); bounds.extend(position); validLocations.push(item.location);
            // report coordinates back to parent so they can be persisted/staged
            if (onUpdateTravelTime) {
              const coords = { lat: position.lat(), lng: position.lng() };
              // duration/distance unknown here; only coords
              onUpdateTravelTime(item.id, item.travelTime || null, item.distance || null, coords);
            }
            await new Promise(r => setTimeout(r, 100));
          }
        } catch (e) {
          console.error(`✗ Failed to geocode: ${item.location}`, e);
        }
      }

      if (markers.length > 0) {
        map.fitBounds(bounds);
        if (markers.length === 1) map.setZoom(12);
      }

      if (validLocations.length > 1) {
        try {
          const waypoints = validLocations.slice(1, -1).map(location => ({ location, stopover: true }));
          const request = { origin: validLocations[0], destination: validLocations[validLocations.length - 1], waypoints, travelMode: window.google.maps.TravelMode.DRIVING, unitSystem: window.google.maps.UnitSystem.METRIC };
          const result = await new Promise((resolve, reject) => directionsService.route(request, (res, status) => status === 'OK' ? resolve(res) : reject(new Error(`Directions failed: ${status}`))));
          directionsRenderer.setDirections(result);
          if (result.routes[0] && result.routes[0].legs && onUpdateTravelTime) {
            const legs = result.routes[0].legs;
            for (let i = 0; i < legs.length; i++) {
              const leg = legs[i];
              const duration = leg.duration.text;
              const distance = leg.distance.text;
              const destinationLocation = validLocations[i + 1];
              const tripItem = sortedTripItems.find(item => item.location === destinationLocation);
              if (tripItem) onUpdateTravelTime(tripItem.id, duration, distance, null);
            }
          }
        } catch (e) {
          console.log('ℹ Directions not available, showing markers only:', e.message);
        }
      }
    } catch (error) {
      console.error('Error processing locations:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [map, sortedTripItems, isProcessing, onUpdateTravelTime, activeIndex, currentZoom, setActiveIndex]);

  useEffect(() => {
    if (!map || !sortedTripItems.length) return;
    const currentDataKey = JSON.stringify(sortedTripItems.map(item => ({ id: item.id, location: item.location })));
    if (lastProcessedData === currentDataKey) return;
    const timer = setTimeout(() => { setLastProcessedData(currentDataKey); processLocations(); }, 1000);
    return () => clearTimeout(timer);
  }, [map, sortedTripItems, processLocations, lastProcessedData]);

  return (
    <div className="relative">
      <div ref={ref} style={{ width: '100%', height: '500px' }} />
      {isProcessing && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">Processing locations...</div>
      )}
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

  if (!apiKey) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
        <p className="font-bold">Google Maps API Key Required</p>
        <p>Please set your Google Maps API key in the environment variable: REACT_APP_GOOGLE_MAPS_API_KEY</p>
        <p className="text-sm mt-2">
          To get an API key:
        </p>
        <ol className="text-sm mt-2 ml-4 list-decimal">
          <li>Visit Google Cloud Console</li>
          <li>Enable Maps JavaScript API and Directions API</li>
          <li>Create an API key</li>
          <li>Add it to Netlify environment variables</li>
        </ol>
      </div>
    );
  }

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
