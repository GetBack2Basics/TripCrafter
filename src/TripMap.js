import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

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

// Simplified Map component with better performance
function Map({ tripItems }) {
  const ref = useRef(null);
  const [map, setMap] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedData, setLastProcessedData] = useState(null);

  // Initialize map only once
  useEffect(() => {
    if (ref.current && !map && window.google) {
      console.log('Initializing Google Map...');
      const newMap = new window.google.maps.Map(ref.current, {
        center: { lat: -41.4545, lng: 147.1595 }, // Tasmania center
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
      console.log('Google Map initialized successfully');
    }
  }, [ref, map]);

  // Process locations with debouncing and loop prevention
  const processLocations = useCallback(async () => {
    if (!map || !tripItems.length || isProcessing) {
      console.log('Skipping processLocations:', { map: !!map, tripItemsLength: tripItems.length, isProcessing });
      return;
    }
    
    setIsProcessing(true);
    console.log('Processing locations:', tripItems.map(item => item.location));

    try {
      const geocoder = new window.google.maps.Geocoder();
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#4F46E5',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });
      
      directionsRenderer.setMap(map);

      // Clear existing elements
      const bounds = new window.google.maps.LatLngBounds();
      const markers = [];
      const validLocations = [];

      // Process each location sequentially to avoid API rate limits
      for (let i = 0; i < tripItems.length; i++) {
        const item = tripItems[i];
        try {
          const results = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: item.location }, (results, status) => {
              if (status === 'OK') resolve(results);
              else reject(new Error(`Geocoding failed for ${item.location}: ${status}`));
            });
          });

          if (results && results[0]) {
            const position = results[0].geometry.location;
            
            // Create marker
            const marker = new window.google.maps.Marker({
              position: position,
              map: map,
              title: `${i + 1}. ${item.location}`,
              label: {
                text: (i + 1).toString(),
                color: 'white',
                fontWeight: 'bold'
              },
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: '#4F46E5',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2
              }
            });

            // Add info window
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="font-family: sans-serif;">
                  <h3 style="margin: 0 0 8px 0; color: #4F46E5;">${item.location}</h3>
                  <p style="margin: 0; color: #666;"><strong>Date:</strong> ${item.date}</p>
                  <p style="margin: 0; color: #666;"><strong>Stay:</strong> ${item.accommodation}</p>
                </div>
              `
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });

            markers.push(marker);
            bounds.extend(position);
            validLocations.push(item.location);
            
            console.log(`✓ Geocoded: ${item.location}`);
            
            // Add small delay between geocoding requests
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`✗ Failed to geocode: ${item.location}`, error);
        }
      }

      // Fit map to bounds
      if (markers.length > 0) {
        map.fitBounds(bounds);
        
        // Add padding if single location
        if (markers.length === 1) {
          map.setZoom(12);
        }
      }

      // Try to add driving directions if multiple valid locations
      if (validLocations.length > 1) {
        try {
          const waypoints = validLocations.slice(1, -1).map(location => ({
            location: location,
            stopover: true
          }));

          const request = {
            origin: validLocations[0],
            destination: validLocations[validLocations.length - 1],
            waypoints: waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC
          };

          const result = await new Promise((resolve, reject) => {
            directionsService.route(request, (result, status) => {
              if (status === 'OK') resolve(result);
              else reject(new Error(`Directions failed: ${status}`));
            });
          });

          directionsRenderer.setDirections(result);
          console.log('✓ Driving route added successfully');
          
        } catch (error) {
          console.log('ℹ Directions not available, showing markers only:', error.message);
        }
      }

    } catch (error) {
      console.error('Error processing locations:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [map, tripItems, isProcessing]);

  // Process locations when map and data are ready
  useEffect(() => {
    if (map && tripItems.length > 0) {
      // Check if we already processed this exact data to prevent infinite loops
      const currentDataKey = JSON.stringify(tripItems.map(item => ({
        id: item.id,
        location: item.location
      })));
      
      if (lastProcessedData === currentDataKey) {
        console.log('Skipping - already processed this data');
        return;
      }
      
      // Debounce to prevent multiple rapid calls
      const timer = setTimeout(() => {
        setLastProcessedData(currentDataKey);
        processLocations();
      }, 1000); // Increased delay to prevent spam
      
      return () => clearTimeout(timer);
    }
  }, [map, tripItems, processLocations, lastProcessedData]);

  return (
    <div className="relative">
      <div ref={ref} style={{ width: '100%', height: '500px' }} />
      {isProcessing && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
          Processing locations...
        </div>
      )}
    </div>
  );
}

// Main TripMap component
function TripMap({ tripItems, loadingInitialData }) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

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

  if (tripItems.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-xl mb-4">No locations to display on map</p>
        <p>Add some trip items with locations to see them on the map!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-indigo-700 mb-2">Trip Route Map</h3>
        <p className="text-gray-600 text-sm">
          {tripItems.length === 1 
            ? `Showing location: ${tripItems[0].location}`
            : `Route through ${tripItems.length} locations: ${tripItems.map(item => item.location).join(' → ')}`
          }
        </p>
      </div>
      
      <div className="border rounded-lg overflow-hidden shadow-lg">
        <Wrapper 
          apiKey={apiKey} 
          render={render}
          libraries={['geometry']}
        >
          <Map tripItems={tripItems} />
        </Wrapper>
      </div>
      
      <div className="mt-4">
        <h4 className="text-lg font-semibold text-indigo-700 mb-2">Trip Timeline</h4>
        <div className="space-y-2">
          {tripItems.map((item, index) => (
            <div key={item.id} className="bg-gray-50 p-3 rounded-lg border flex items-center space-x-3">
              <span className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {index + 1}
              </span>
              <div className="flex-grow">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{item.location}</p>
                    <p className="text-sm text-gray-600">{item.accommodation}</p>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 sm:mt-0">
                    {item.date}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TripMap;
