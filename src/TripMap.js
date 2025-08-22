import React, { useEffect, useRef, useState } from 'react';

// setLoadingInitialData needs to be destructured from props
function TripMap({ tripItems, loadingInitialData, setLoadingInitialData }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [mapError, setMapError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const directionsRendererRef = useRef(null);

  // Load Google Maps API script
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID;

    if (!apiKey) {
      setMapError("Google Maps API Key is missing. Please set REACT_APP_GOOGLE_MAPS_API_KEY in Netlify environment variables.");
      console.error("Map initialization failed: API Key missing.");
      return;
    }
    if (!mapId) {
      setMapError("Google Maps Map ID is missing. Please set REACT_APP_GOOGLE_MAPS_MAP_ID in Netlify environment variables.");
      console.error("Map initialization failed: Map ID missing.");
      return;
    }

    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps && !mapLoaded) {
      console.log("Google Maps API already loaded.");
      setMapLoaded(true);
      return;
    }

    // If not loaded, append script to head
    if (!mapLoaded) {
      console.log("Attempting to load Google Maps API script...");
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      script.setAttribute('loading', 'async');
      script.onerror = () => {
        setMapError("Failed to load Google Maps script. Check your API key and network connection.");
        console.error("Google Maps script loading failed.");
      };
      document.head.appendChild(script);

      // Define the callback function globally
      window.initGoogleMaps = () => {
        console.log("Google Maps API script loaded successfully via callback.");
        setMapLoaded(true);
        // Clear the global callback to avoid re-execution
        delete window.initGoogleMaps;
      };
    }

    return () => {
      // Cleanup script if component unmounts
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript && document.head.contains(existingScript)) {
        document.head.removeChild(existingScript);
        console.log("Google Maps script removed on component unmount.");
      }
      delete window.initGoogleMaps; // Clean up global callback
    };
  }, [mapLoaded]);

  // Effect to initialize the map once the API is loaded and ref is ready
  useEffect(() => {
    if (mapLoaded && mapRef.current && window.google && window.google.maps && !map) {
      console.log("Initializing map...");
      const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID;
      try {
        const defaultCenter = { lat: -41.6401, lng: 146.3159 }; // Center of Tasmania
        const newMap = new window.google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 8,
          mapId: mapId,
        });
        setMap(newMap);
        setMapError('');
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer();
        directionsRendererRef.current.setMap(newMap);
        console.log("Map initialized successfully.");
      } catch (error) {
        setMapError(`Failed to initialize map: ${error.message}`);
        console.error("Map initialization error:", error);
      }
    } else {
      console.log("Map initialization useEffect skipped:", { mapLoaded, mapRefCurrent: !!mapRef.current, windowGoogleMaps: !!(window.google && window.google.maps), map: !!map });
    }
  }, [mapLoaded, map, mapRef]);

  // Effect to geocode locations and draw routes
  useEffect(() => {
    if (!map || !tripItems || tripItems.length === 0 || loadingInitialData || !mapLoaded) {
      console.log("Geocoding/Routing useEffect skipped: map, tripItems, loadingInitialData, or mapLoaded not ready.", { map: !!map, tripItemsLength: tripItems.length, loadingInitialData, mapLoaded });
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    const directionsService = new window.google.maps.DirectionsService();
    const markers = [];
    const validLocations = [];
    const bounds = new window.google.maps.LatLngBounds(); // To fit all markers and route on map

    const processTrip = async () => {
      console.log("Starting geocoding and routing process...");
      for (const item of tripItems) {
        if (!item.location) {
          console.warn(`Skipping geocoding for item with no location: ${item.id}`);
          continue;
        }

        try {
          const geocodeResult = await new Promise((resolve) => {
            geocoder.geocode({ address: item.location + ", Tasmania, Australia" }, (results, status) => {
              if (status === "OK" && results[0]) {
                resolve(results[0].geometry.location);
              } else {
                console.warn(`Geocoding failed for "${item.location}": ${status}`);
                resolve(null);
              }
            });
          });

          if (geocodeResult) {
            validLocations.push({ ...item, latLng: geocodeResult });
            bounds.extend(geocodeResult); // Extend bounds for each valid location

            // Add marker
            const marker = new window.google.maps.Marker({
              position: geocodeResult,
              map: map,
              title: `${item.location} (${item.accommodation})`,
              label: item.date.substring(8, 10),
            });
            markers.push(marker);

            // Add Info Window
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div class="p-2">
                  <h4 class="font-bold text-indigo-700 text-base">${item.location}</h4>
                  <p class="text-sm text-gray-800"><strong>Accommodation:</strong> ${item.accommodation}</p>
                  ${item.activities ? `<p class="text-sm text-gray-700"><strong>Activities:</strong> ${item.activities}</p>` : ''}
                  ${item.travelTime ? `<p class="text-sm text-gray-700"><strong>Est. Travel Time:</strong> ${item.travelTime}</p>` : ''}
                  ${item.notes ? `<p class="text-sm text-gray-700"><strong>Notes:</strong> ${item.notes}</p>` : ''}
                </div>
              `,
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });
          }
        } catch (error) {
          console.error("Error during geocoding for item:", item.id, error);
        }
      }

      // Draw routes if there are at least two valid locations
      if (validLocations.length > 1) {
        console.log("Drawing route between valid locations...");
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
                // Update individual trip item travel time in Firestore
                // This is a more complex operation, requires matching legs to tripItems
                // For now, we'll just log the duration for each leg
                const legDurationMinutes = Math.round(route.legs[i].duration.value / 60);
                console.log(`Leg ${i + 1} (${route.legs[i].start_address} to ${route.legs[i].end_address}): ${legDurationMinutes} minutes`);

                // TODO: Store this leg duration back to the corresponding trip item in Firestore
                // This would require a more sophisticated matching logic and Firestore update calls.
              }
              const totalDurationMinutes = Math.round(totalDuration / 60);
              console.log(`Total estimated travel time for the entire trip: ${totalDurationMinutes} minutes`);

              // Fit map to route bounds
              map.fitBounds(route.bounds);
            } else {
              console.error("Directions request failed:", status);
              setMapError(`Failed to load route: ${status}`);
            }
          }
        );
      } else if (validLocations.length === 1) {
        map.setCenter(validLocations[0].latLng);
        map.setZoom(10);
      } else {
        console.log("No valid locations to draw route or markers.");
        // If no locations, ensure map is centered on Tasmania
        map.setCenter({ lat: -41.6401, lng: 146.3159 });
        map.setZoom(8);
      }
      setLoadingInitialData(false); // Ensure loading is false after map processing
    };

    processTrip();

    // Cleanup function for markers and directions
    return () => {
      markers.forEach(marker => marker.setMap(null));
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] });
      }
      console.log("Map markers and directions cleaned up.");
    };
  }, [map, tripItems, loadingInitialData, mapLoaded, setLoadingInitialData]); // Added setLoadingInitialData to dependencies

  if (mapError) {
    return (
      <div className="text-center text-red-500 text-xl py-8">
        Map Error: {mapError}
      </div>
    );
  }

  if (loadingInitialData || !mapLoaded || !map) { // Check mapLoaded here
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
