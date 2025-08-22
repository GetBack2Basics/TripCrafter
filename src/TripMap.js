import React, { useEffect, useRef, useState } from 'react';

function TripMap({ tripItems, loadingInitialData }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [mapError, setMapError] = useState('');
  const directionsRendererRef = useRef(null); // Ref for DirectionsRenderer

  // Load Google Maps API script and initialize map
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID;

    if (!apiKey) {
      setMapError("Google Maps API Key is missing. Please set REACT_APP_GOOGLE_MAPS_API_KEY in Netlify environment variables.");
      return;
    }
    if (!mapId) {
      setMapError("Google Maps Map ID is missing. Please set REACT_APP_GOOGLE_MAPS_MAP_ID in Netlify environment variables.");
      return;
    }

    if (window.google && window.google.maps) {
      if (!map) {
        initMap(mapId);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.setAttribute('loading', 'async'); // Added loading="async" attribute
    script.onerror = () => {
      setMapError("Failed to load Google Maps script. Check your API key and network connection.");
    };
    document.head.appendChild(script);

    script.onload = () => {
      if (!map) {
        initMap(mapId);
      }
    };

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [map]); // Re-run if map state changes

  const initMap = (mapId) => {
    if (mapRef.current && window.google) {
      const defaultCenter = { lat: -41.6401, lng: 146.3159 }; // Center of Tasmania
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 8,
        mapId: mapId,
      });
      setMap(newMap);
      setMapError('');
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer(); // Initialize DirectionsRenderer
      directionsRendererRef.current.setMap(newMap); // Link renderer to the map
    }
  };

  // Effect to geocode locations and draw routes
  useEffect(() => {
    if (!map || !tripItems || tripItems.length === 0 || loadingInitialData) return;

    const geocoder = new window.google.maps.Geocoder();
    const directionsService = new window.google.maps.DirectionsService();
    const markers = []; // To hold markers for cleanup
    const validLocations = []; // To hold successfully geocoded locations for routing

    const processTrip = async () => {
      for (const item of tripItems) {
        if (!item.location) continue;

        try {
          const geocodeResult = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: item.location + ", Tasmania, Australia" }, (results, status) => {
              if (status === "OK" && results[0]) {
                resolve(results[0].geometry.location);
              } else {
                console.warn(`Geocoding failed for ${item.location}: ${status}`);
                resolve(null);
              }
            });
          });

          if (geocodeResult) {
            validLocations.push({ ...item, latLng: geocodeResult });

            // Add marker
            const marker = new window.google.maps.Marker({
              position: geocodeResult,
              map: map,
              title: `${item.location} (${item.accommodation})`,
              label: item.date.substring(8, 10), // Day of month as label
            });
            markers.push(marker);
          }
        } catch (error) {
          console.error("Error during geocoding:", error);
        }
      }
      // setGeocodedLocations(validLocations); // This state is no longer needed

      // Draw routes if there are at least two valid locations
      if (validLocations.length > 1) {
        const waypoints = validLocations.slice(1, -1).map(loc => ({
          location: loc.latLng,
          stopover: true,
        }));

        const origin = validLocations[0].latLng;
        const destination = validLocations[validLocations.length - 1].latLng;

        directionsService.route(
          {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (response, status) => {
            if (status === "OK" && response) {
              directionsRendererRef.current.setDirections(response);
              const route = response.routes[0];
              let totalDuration = 0;
              for (let i = 0; i < route.legs.length; i++) {
                totalDuration += route.legs[i].duration.value; // duration in seconds
              }
              const totalDurationMinutes = Math.round(totalDuration / 60);
              console.log(`Total estimated travel time for the trip: ${totalDurationMinutes} minutes`);
              // TODO: Integrate this time back into Firestore for each segment
            } else {
              console.error("Directions request failed:", status);
              setMapError(`Failed to load route: ${status}`);
            }
          }
        );
      } else if (validLocations.length === 1) {
        map.setCenter(validLocations[0].latLng);
        map.setZoom(10);
      }
    };

    processTrip();

    // Cleanup function for markers and directions
    return () => {
      markers.forEach(marker => marker.setMap(null)); // Remove markers
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] }); // Clear directions
      }
    };
  }, [map, tripItems, loadingInitialData]);

  if (mapError) {
    return (
      <div className="text-center text-red-500 text-xl py-8">
        Map Error: {mapError}
      </div>
    );
  }

  if (loadingInitialData || !map) {
    return (
      <div className="text-center text-gray-500 text-xl py-8">Loading map...</div>
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
