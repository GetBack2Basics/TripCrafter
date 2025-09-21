import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Minimal TripMap component — safe for builds and local testing.
export default function TripMap() {
  const center = [-41.4545, 147.1595]; // Tasmania default

  return (
    <div className="w-full h-96">
      <MapContainer center={center} zoom={6} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
      </MapContainer>
    </div>
  );
}
