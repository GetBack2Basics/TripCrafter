import React, { useEffect, useRef, forwardRef } from 'react';
import OpenPoiMapEmbed from './OpenPoiMapEmbed';

function normalizeItems(tripItems) {
  return (tripItems || []).map(it => ({
    id: it.id || it.tempId || null,
    title: it.title || it.location || '',
    location: it.location || '',
    lat: (it.position && (it.position.lat ?? it.position[0])) || it.lat || null,
    lng: (it.position && (it.position.lng ?? it.position[1])) || it.lng || null,
    type: it.type || 'enroute',
    date: it.date || ''
  }));
}

// Minimal TripMap host: embed-only. Sends normalized trip items to iframe via postMessage.
const TripMap = forwardRef(function TripMap(props, ref) {
  const { tripItems = [], currentTripId = null, onAddItem = null, style = {} } = props;
  const embedRef = useRef(null);

  // Expose embed ref to parent if provided
  useEffect(() => {
    if (!ref) return;
    if (typeof ref === 'function') ref(embedRef.current);
    else ref.current = embedRef.current;
  }, [ref]);

  // Sync trip items to iframe when they change
  useEffect(() => {
    try {
      const items = normalizeItems(tripItems);
      if (embedRef.current && typeof embedRef.current.syncTrip === 'function') {
        embedRef.current.syncTrip(currentTripId, items);
      } else if (embedRef.current && typeof embedRef.current.sendMessage === 'function') {
        embedRef.current.sendMessage({ type: 'syncTrip', payload: { tripId: currentTripId, items } });
      }
    } catch (e) {
      console.warn('TripMap: failed to sync trip to embed', e);
    }
  }, [tripItems, currentTripId]);

  // Bridge: allow embed to request adding an item into the React app
  useEffect(() => {
    window.__TRIPCRAFT_MAP_ADD_ITEM__ = (payload) => {
      try { if (typeof onAddItem === 'function') onAddItem(payload); } catch (e) { console.warn('Add item bridge failed', e); }
    };
    return () => { try { delete window.__TRIPCRAFT_MAP_ADD_ITEM__; } catch (e) {} };
  }, [onAddItem]);

  // Imperative helper to request embed to fly to coords or geocode+fly
  const flyTo = async (opts = {}) => {
    try {
      if (!embedRef.current) return { ok: false, error: 'no-embed' };
      if (opts.lat != null && opts.lng != null) {
        return embedRef.current.sendMessage({ type: 'flyTo', payload: { lat: Number(opts.lat), lng: Number(opts.lng), zoom: opts.zoom } });
      }
      if (opts.location) {
        return embedRef.current.sendMessage({ type: 'flyToLocation', payload: { location: opts.location } });
      }
      return { ok: false, error: 'invalid-params' };
    } catch (e) { return { ok: false, error: String(e) }; }
  };

  return (
    <div style={{ width: '100%', ...style }}>
      <OpenPoiMapEmbed ref={embedRef} src="/openpoimap-lite.html" style={{ width: '100%', height: 520, border: '0' }} />
    </div>
  );
});

export default TripMap;
