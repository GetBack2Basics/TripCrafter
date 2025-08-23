import React, { useEffect, useRef, useState } from 'react';
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

// Map component that will render the actual Google Map
function Map({ tripItems }) {
  const ref = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);

  useEffect(() => {
    if (ref.current && !map) {
      // Initialize the map
      const newMap = new window.google.maps.Map(ref.current, {
        center: { lat: -41.4545, lng: 147.1595 }, // Roughly center of Tasmania
        zoom: 8,
        mapTypeId: 'roadmap',
      });
      
      setMap(newMap);
      
      // Initialize directions service and renderer
      const service = new window.google.maps.DirectionsService();
      const renderer = new window.google.maps.DirectionsRenderer({
        draggable: false,
        suppressMarkers: false,
      });
      
      setDirectionsService(service);
      setDirectionsRenderer(renderer);
      
      renderer.setMap(newMap);
    }
  }, [ref, map]);

  useEffect(() => {
    if (map && directionsService && directionsRenderer && tripItems.length > 1) {
      // Clear existing routes
      directionsRenderer.setDirections({ routes: [] });
      
      // Create waypoints from trip items
      const locations = tripItems.map(item => item.location);
      
      // If we have at least 2 locations, create a route
      if (locations.length >= 2) {
        const origin = locations[0];
        const destination = locations[locations.length - 1];
        const waypoints = locations.slice(1, -1).map(location => ({
          location: location,
          stopover: true
        }));

        const request = {
          origin: origin,
          destination: destination,
          waypoints: waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: false
        };

        console.log('Requesting directions for:', { origin, destination, waypoints });

        directionsService.route(request, (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
            
            // Optionally adjust the map bounds to fit the route
            const bounds = new window.google.maps.LatLngBounds();
            result.routes[0].legs.forEach(leg => {
              bounds.extend(leg.start_location);
              bounds.extend(leg.end_location);
            });
            map.fitBounds(bounds);
            console.log('Directions successfully loaded');
          } else {
            console.error('Directions request failed due to ' + status);
            console.log('Trying to add individual markers instead...');
            
            // Fallback: Add individual markers for each location
            const geocoder = new window.google.maps.Geocoder();
            locations.forEach((location, index) => {
              geocoder.geocode({ address: location }, (results, geocodeStatus) => {
                if (geocodeStatus === 'OK') {
                  new window.google.maps.Marker({
                    position: results[0].geometry.location,
                    map: map,
                    title: location,
                    label: (index + 1).toString()
                  });
                } else {
                  console.error('Geocode failed for ' + location + ': ' + geocodeStatus);
                }
              });
            });
          }
        });
      }
    }
  }, [map, directionsService, directionsRenderer, tripItems]);

  return <div ref={ref} style={{ width: '100%', height: '500px' }} />;
}

// Main TripMap component
function TripMap({ tripItems, loadingInitialData }) {
  // You'll need to replace this with your actual Google Maps API key
  // For development, you can set it as an environment variable: REACT_APP_GOOGLE_MAPS_API_KEY
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
          You can get an API key from the{' '}
          <a 
            href="https://console.cloud.google.com/google/maps-apis/overview" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-yellow-800"
          >
            Google Cloud Console
          </a>
        </p>
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
          Showing route through {tripItems.length} locations: {tripItems.map(item => item.location).join(' → ')}
        </p>
      </div>
      
      <div className="border rounded-lg overflow-hidden shadow-lg">
        <Wrapper apiKey={apiKey} render={render}>
          <Map tripItems={tripItems} />
        </Wrapper>
      </div>
      
      <div className="mt-4">
        <h4 className="text-lg font-semibold text-indigo-700 mb-2">Trip Locations</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tripItems.map((item, index) => (
            <div key={item.id} className="bg-gray-50 p-3 rounded-lg border">
              <div className="flex items-center space-x-2">
                <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-gray-800">{item.location}</p>
                  <p className="text-sm text-gray-600">{item.date}</p>
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
