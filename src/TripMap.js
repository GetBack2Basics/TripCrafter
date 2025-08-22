import React, { useEffect, useRef, useState } from 'react';

function TripMap({ tripItems, loadingInitialData }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [mapError, setMapError] = useState('');

  // Load Google Maps API script
  useEffect(() => {
    // Check if Google Maps API key is available
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID; // Get custom Map ID
    
    if (!apiKey) {
      setMapError("Google Maps API Key is missing. Please set REACT_APP_GOOGLE_MAPS_API_KEY in Netlify environment variables.");
      return;
    }
    if (!mapId) {
      setMapError("Google Maps Map ID is missing. Please set REACT_APP_GOOGLE_MAPS_MAP_ID in Netlify environment variables.");
      return;
    }

    if (window.google) {
      // If script is already loaded, initialize map
      if (!map) {
        initMap(mapId); // Pass mapId to initMap
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setMapError("Failed to load Google Maps script. Check your API key and network connection.");
    };
    document.head.appendChild(script);

    script.onload = () => {
      if (!map) {
        initMap(mapId); // Pass mapId to initMap
      }
    };

    return () => {
      // Clean up script if component unmounts
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [map]); // Re-run if map state changes

  const initMap = (mapId) => { // Accept mapId as argument
    if (mapRef.current && window.google) {
      const defaultCenter = { lat: -41.6401, lng: 146.3159 }; // Center of Tasmania
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 8,
        mapId: mapId, // Use the provided custom Map ID
      });
      setMap(newMap);
      setMapError(''); // Clear any previous map errors
    }
  };

  if (mapError) {
    return (
      <div className="text-center text-red-500 text-xl py-8">
        Map Error: {mapError}
      </div>
    );
  }

  if (loadingInitialData) {
    return (
      <div className="text-center text-gray-500 text-xl py-8">Loading map data...</div>
    );
  }

  return (
    <div className="w-full h-[600px] bg-gray-200 rounded-lg shadow-inner overflow-hidden">
      <div ref={mapRef} className="w-full h-full" aria-label="Trip Map">
        {/* Map will render here */}
      </div>
    </div>
  );
}

export default TripMap;
