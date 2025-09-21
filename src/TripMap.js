import React, { useEffect, useState, useCallback } from 'react';
import { BedDouble, Tent, Car, Info, Ship } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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
  try {
    console.log('Geocoding location:', location);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`);
    const data = await response.json();
    console.log('Geocoding response for', location, ':', data);
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (error) {
    console.error('Geocoding failed:', error);
  }
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

  return L.divIcon({
    html,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
}

// Main TripMap component with Leaflet
function TripMap({ tripItems, loadingInitialData, onUpdateTravelTime }) {
  const [markers, setMarkers] = useState([]);
  const [route, setRoute] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(7);
  const [accomNights, setAccomNights] = useState({});
  const [activeIndex, setActiveIndex] = useState(null);
  const [imageIndexes, setImageIndexes] = useState({});

  // Filter out "note" type items from mapping and sort by date for consistent ordering
  const mappableItems = tripItems.filter(item => item.type !== 'note');
  const sortedTripItems = Array.isArray(mappableItems) ? mappableItems.slice().sort((a, b) => (a?.date || '').localeCompare(b?.date || '')) : [];

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
        {tripItems.length > 0 ? (
          <p>Your trip items are notes only. Add locations with type 'Roofed', 'Camp', or 'Enroute' to see them on the map!</p>
        ) : (
          <p>Add some trip items with locations to see them on the map!</p>
        )}
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

      sortedTripItems.forEach(item => {
        if (item.type === 'roofed' || item.type === 'camp') {
          newAccomNights[item.location] = (newAccomNights[item.location] || 0) + (item.nights || 1);
        }
      });

      setAccomNights(newAccomNights);

      for (let i = 0; i < sortedTripItems.length; i++) {
        const item = sortedTripItems[i];
        if (item.type === 'note') continue;

        const coords = await geocodeLocation(item.location);
        if (coords) {
          coordinates.push(coords);
          const scale = (item.type === 'roofed' || item.type === 'camp') ? 1 + 0.2 * (newAccomNights[item.location] - 1) : 0.8;
          const labelIndex = (typeof item.displayIndex === 'number') ? item.displayIndex : (i + 1);
          const marker = {
            id: item.id,
            position: coords,
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

      setMarkers(newMarkers);

      // Get route if we have multiple coordinates
      if (coordinates.length > 1) {
        console.log('Getting route for coordinates:', coordinates);
        const routeData = await getRoute(coordinates);
        console.log('Route data received:', routeData);
        if (routeData) {
          const routeCoords = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert to [lat, lng]
          console.log('Converted route coordinates:', routeCoords.slice(0, 5), '...'); // Log first 5 points
          setRoute(routeCoords);

          // Update travel times
          if (onUpdateTravelTime && routeData.legs) {
            routeData.legs.forEach((leg, idx) => {
              const duration = `${Math.round(leg.duration / 60)} mins`;
              const distance = `${(leg.distance / 1000).toFixed(1)} km`;
              const destinationIndex = idx + 1;
              if (destinationIndex < newMarkers.length) {
                const itemId = newMarkers[destinationIndex].id;
                onUpdateTravelTime(itemId, duration, distance, null);
              }
            });
          }
        } else {
          console.log('No route data received from OSRM');
        }
      } else {
        console.log('Not enough coordinates for routing:', coordinates.length);
      }
    } catch (error) {
      console.error('Error processing locations:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [sortedTripItems, isProcessing, onUpdateTravelTime, activeIndex]);

  useEffect(() => {
    processLocations();
  }, [processLocations]);

  const center = markers.length > 0
    ? markers[0].position
    : [-41.4545, 147.1595]; // Default to Tasmania

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
                    const displayIndex = idx + 1;
                    return <span key={item.id} className={`${color} ${font}`}>{displayIndex}. {getPlaceName(item.location)}{idx < mappableItems.length-1 && <span className="text-gray-400"> → </span>}</span>;
                  })
                }
              </>
          }
          {tripItems.length > mappableItems.length &&
            <span className="text-gray-400">({tripItems.length - mappableItems.length} note items excluded from map)</span>
          }
        </p>
        <p className="text-blue-600 text-xs mt-1">
          💡 Travel times will be automatically calculated and updated based on OpenStreetMap routing data
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-lg">
        <div className="relative">
          <MapContainer
            center={center}
            zoom={currentZoom}
            style={{ height: '500px', width: '100%' }}
            whenReady={() => setCurrentZoom(7)}
            onZoomEnd={(e) => setCurrentZoom(e.target.getZoom())}
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
                  click: () => setActiveIndex(marker.index)
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
            {route && console.log('Rendering route with positions:', route.slice(0, 3), '...')}
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
