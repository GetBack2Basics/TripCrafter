
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, addDoc, updateDoc, deleteDoc, onSnapshot, doc, where, writeBatch, getDocs, arrayUnion } from 'firebase/firestore';

// Helper: invalidate adjacent routeSegments when an item changes
async function invalidateSegmentsForItem(tripId, itemId, prevId, nextId) {
  try {
    if (!tripId) return;
    const makeId = (a, b) => `${a || 'null'}__${b || 'null'}`;
    const segIds = [];
    if (prevId) segIds.push(makeId(prevId, itemId));
    if (itemId && nextId) segIds.push(makeId(itemId, nextId));
    // Firestore delete using batch
    try {
      const b = writeBatch(db);
      for (const sid of segIds) {
        const ref = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${tripId}/routeSegments`, sid);
        b.delete(ref);
      }
      await b.commit();
    } catch (e) {
      // Ignore firestore errors; continue to local cleanup
      console.warn('invalidateSegmentsForItem firestore delete failed', e);
    }
    // localStorage fallback cleanup
    try {
      for (const sid of segIds) {
        const key = `tripRouteSegment:${tripId}:${sid.replace(/__/g, ':')}`;
        try { localStorage.removeItem(key); } catch (e) {}
      }
    } catch (e) { /* ignore */ }
  } catch (e) { console.warn('invalidateSegmentsForItem failed', e); }
}
import defaultTasmaniaTripDataRaw from '../Trip-Default_Tasmania2025';
import TripList from '../TripList';
import TripMap from '../TripMap';
import TripTable from '../TripTable';
import BottomNav from './BottomNav';
import AIImportModal from './AIImportModal';
import MergeRequestModal from './MergeRequestModal';
import TripProfileModal from './TripProfileModal';
import TripHelpModal from './TripHelpModal';
import TripForm from '../TripForm';
import AppHeader from './AppHeader';
import LoginModal from './LoginModal';
import TripSelectModal from './TripSelectModal';
import TripCreateModal from './TripCreateModal';
import TripShareModal from './TripShareModal';


export default function TripDashboard() {
  // Minimal state for UI skeleton
  // Start on itinerary view to avoid showing Discover while Unsplash access is pending
  const [activeView, setActiveView] = useState('itinerary');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAIImportModal, setShowAIImportModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Auth / profile state
  const [userEmail, setUserEmail] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userTrips, setUserTrips] = useState([]);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [currentTripName, setCurrentTripName] = useState(null);
  const [showTripSelectModal, setShowTripSelectModal] = useState(false);
  const [showTripCreateModal, setShowTripCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTripForShare, setSelectedTripForShare] = useState(null);
  const [tripProfile, setTripProfile] = useState({ adults: 2, children: 0, interests: [], diet: 'everything', hotelType: 'any', budgetRange: 'any', roomType: 'any' });
  // Compute a user-visible trip name using several fallbacks so the UI shows a name whenever possible
  const displayTripName = currentTripName || (userTrips && userTrips.find(t => t.id === currentTripId) && userTrips.find(t => t.id === currentTripId).name) || (tripProfile && tripProfile.name) || 'Trip Itinerary';
  // Runtime debug: log key values so we can see why fallback is used
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.debug('TripDashboard debug:', {
        displayTripName,
        currentTripName,
        currentTripId,
        userTripsCount: Array.isArray(userTrips) ? userTrips.length : 0,
        tripProfileName: tripProfile && tripProfile.name
      });
    } catch (e) {}
  }, [displayTripName, currentTripName, currentTripId, userTrips, tripProfile]);
  const [showStagedModal, setShowStagedModal] = useState(false);
  // Use normalized default trip data for demo (not-logged-in) users
  // Helper to create a slug for image filenames
  function locationSlug(location) {
    if (!location) return 'default';
    return location
      .replace(/,?\s*tas(\s*\d{4})?/i, '')
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/_+/g, '_')
      .replace(/,/g, '__')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  function discoverImagesForLocation(location) {
  const q = encodeURIComponent((location || 'travel').split(',')[0]);
  // Use size-based Unsplash Source URLs (more reliable): /800x600/?<query>
  return [1, 2, 3].map(i => `https://source.unsplash.com/800x600/?${q}&sig=${i}`);
  }

  // Generate a sensible activity/title link based on type, location and date
  function generateActivityLink(type, location, checkinDate, adults = 2, children = 0, tripSettings = {}) {
    if (!location) return '';
    const locationParts = location.split(',');
    const cityName = locationParts[0].trim();
    const state = tripSettings.state || 'Tasmania';
    const country = tripSettings.country || 'Australia';

    switch (type) {
      case 'roofed': {
        if (!checkinDate) return '';
        const checkin = new Date(checkinDate);
        if (isNaN(checkin.getTime())) return '';
        const checkinYear = checkin.getFullYear();
        const checkinMonth = checkin.getMonth() + 1;
        const checkinDay = checkin.getDate();
        const checkout = new Date(checkin);
        checkout.setDate(checkout.getDate() + 1);
        const checkoutYear = checkout.getFullYear();
        const checkoutMonth = checkout.getMonth() + 1;
        const checkoutDay = checkout.getDate();
        // Build a more complete Booking.com search URL that includes locale and rooms
        const baseUrl = 'https://www.booking.com/searchresults.en-gb.html';
        const searchLocation = `${cityName}, ${state || ''} ${country || ''}`.replace(/\s+/g, ' ').trim();
        const params = new URLSearchParams({
          ss: searchLocation,
          lang: 'en-gb',
          efdco: '1',
          sb: '1',
          src: 'index',
          src_elem: 'sb',
          checkin: `${checkinYear}-${String(checkinMonth).padStart(2, '0')}-${String(checkinDay).padStart(2, '0')}`,
          checkout: `${checkoutYear}-${String(checkoutMonth).padStart(2, '0')}-${String(checkoutDay).padStart(2, '0')}`,
          group_adults: String(adults),
          no_rooms: '1',
          group_children: String(children || 0)
        });
        return `${baseUrl}?${params.toString()}`;
      }
      case 'camp': {
        const campSearchQuery = encodeURIComponent(`campsites near ${cityName} ${state} ${country}`);
        return `https://www.google.com/search?q=${campSearchQuery}`;
      }
      case 'enroute': {
        const searchQuery = encodeURIComponent(`things to do ${cityName} ${state} ${country} activities attractions`);
        return `https://www.google.com/search?q=${searchQuery}`;
      }
      default:
        return '';
    }
  }

  // Generate a title-specific link (prefer searching by the exact title/property name)
  function generateTitleLink(title, type, location, checkinDate, adults = 2, children = 0, tripSettings = {}) {
    if (!title) return '';
    // Prefer a Booking.com search for accommodation titles
    if (type === 'roofed') {
      if (!checkinDate) return '';
      const checkin = new Date(checkinDate);
      if (isNaN(checkin.getTime())) return '';
      const checkinYear = checkin.getFullYear();
      const checkinMonth = checkin.getMonth() + 1;
      const checkinDay = checkin.getDate();
      const checkout = new Date(checkin);
      checkout.setDate(checkout.getDate() + 1);
      const checkoutYear = checkout.getFullYear();
      const checkoutMonth = checkout.getMonth() + 1;
      const checkoutDay = checkout.getDate();
      // Prefer a Booking.com search URL that includes locale and rooms; title used as search term
      // Use a Google hotel search (avoids Booking.com partner requirements)
      // Prefer location first (city/area) when present, else fall back to title
      // Incorporate profile preferences into the search to improve relevance
      const profilePrefs = tripSettings || {};
      const pt = profilePrefs.hotelType && profilePrefs.hotelType !== 'any' ? `${profilePrefs.hotelType}` : '';
      const bd = profilePrefs.budgetRange && profilePrefs.budgetRange !== 'any' ? `${profilePrefs.budgetRange}` : '';
      const rm = profilePrefs.roomType && profilePrefs.roomType !== 'any' ? `${profilePrefs.roomType}` : '';
      const people = `for ${String(adults || 2)} adults${children ? `, ${String(children)} child${children > 1 ? 'ren' : ''}` : ''}`;
      const locationPart = (location && String(location).trim()) ? `hotels in ${String(location).trim()}` : `hotels ${title}`;
      const extras = [pt, bd, rm].filter(Boolean).join(' ');
      const searchTerm = [locationPart, extras, people, `checkin ${checkinYear}-${String(checkinMonth).padStart(2, '0')}-${String(checkinDay).padStart(2, '0')}`].filter(Boolean).join(' ');
      const q = encodeURIComponent(searchTerm);
      return `https://www.google.com/search?q=${q}`;
    }

    // For camp or enroute, fall back to a Google search for the title
    const q = encodeURIComponent(`${title} ${tripSettings.state || 'Tasmania'} ${tripSettings.country || 'Australia'}`);
    return `https://www.google.com/search?q=${q}`;
  }

  function normalizeTripItem(item) {
    // Ensure all required fields exist and are named consistently
    // Accept a profile object on the incoming item to make links profile-aware
  const profile = item.profile || {};
  const adults = profile.adults || 2;
  const children = profile.children || 0;
  const tripSettings = profile || {};
  return {
      id: item.id || Math.random().toString(36).substr(2, 9),
      date: item.date || '',
      location: item.location || '',
      title: item.title || item.activities || '',
      status: item.status || 'Unconfirmed',
      notes: item.notes || '',
      travelTime: item.travelTime || '',
      activities: item.activities || '',
  type: item.type || 'roofed',
  // titleLink: for roofed/camp/enroute items build the search link preferring location over title
  // Override any stored titleLink to ensure the link uses current location/title/date data
  titleLink: (item.type === 'roofed' || item.type === 'camp' || item.type === 'enroute') ? generateTitleLink(item.title || '', item.type, item.location, item.date, adults, children, tripSettings) : '',
  // activityLink: use location-based searches for activity suggestions for all types except 'note'
  activityLink: (item.type && item.type !== 'note') ? (item.activityLink || generateActivityLink(item.type || 'enroute', item.location, item.date, adults, children, tripSettings)) : '',
      discoverImages: discoverImagesForLocation(item.location),
      // fractional ordering position (optional). Keep numeric when present.
      position: (typeof item.position === 'number') ? item.position : (item.position ? parseFloat(item.position) : undefined)
    };
  }
  // Strip undefined values from an object recursively (shallow) before sending to Firestore
  const stripUndefined = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const out = {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'undefined') continue;
      out[k] = v;
    }
    return out;
  };
  // Ensure trip items are always stored in date order (handles empty dates safely)
  function sortTripItems(items) {
    if (!Array.isArray(items)) return [];
    return items.slice().sort((a, b) => {
      const ad = a && a.date ? String(a.date) : '';
      const bd = b && b.date ? String(b.date) : '';
      const dateCmp = ad.localeCompare(bd);
      if (dateCmp !== 0) return dateCmp;
      // Same date: sort by numeric position when available, otherwise fallback to id to make sort stable
      const ap = (typeof a.position === 'number') ? a.position : 0;
      const bp = (typeof b.position === 'number') ? b.position : 0;
      if (ap !== bp) return ap - bp;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }
  const [tripItems, setTripItems] = useState(sortTripItems(defaultTasmaniaTripDataRaw.map(normalizeTripItem)));
  const [mergeRequests, setMergeRequests] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [pendingOps, setPendingOps] = useState([]);
  const [lastSyncedItems, setLastSyncedItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [editingTripName, setEditingTripName] = useState(false);
  const [editTripNameValue, setEditTripNameValue] = useState('');
  const pushDebug = (msg) => {
    const ts = new Date().toISOString();
    const entry = { ts, msg };
    setDebugLogs(d => [entry, ...d].slice(0, 200));
    try {
      // maintain a global copy so the DebugPanel can read it without prop drilling
      // eslint-disable-next-line no-undef
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-undef
        window.__TRIPCRAFT_DEBUG_LOGS__ = [entry].concat(window.__TRIPCRAFT_DEBUG_LOGS__ || []).slice(0, 200);
      }
    } catch (e) {
      // ignore
    }
    // also mirror to console for dev
    // eslint-disable-next-line no-console
    console.debug('[debugPanel]', ts, msg);
  };
  const addToast = (message, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  };

  // Restore any local draft saved by demo/offline savePendingChanges()
  useEffect(() => {
    try {
      const draftKey = 'tripDraft:local';
      const raw = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem(draftKey) : null;
      if (raw) {
        const draft = JSON.parse(raw || '{}');
        if (draft && Array.isArray(draft.tripItems) && draft.tripItems.length > 0) {
          // Normalize before applying
          const items = draft.tripItems.map(normalizeTripItem);
          setTripItems(sortTripItems(items));
          setPendingOps(Array.isArray(draft.pendingOps) ? draft.pendingOps.slice() : []);
          addToast('Restored local draft changes', 'info');
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const hasPending = () => Array.isArray(pendingOps) && pendingOps.length > 0;
  const [newItem, setNewItem] = useState({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
  const [editingItem, setEditingItem] = useState(null);

  // Helper: compute last date among trip items (ISO string) or today's date if none
  const getLastItemDateIso = () => {
    if (!Array.isArray(tripItems) || tripItems.length === 0) {
      const d = new Date();
      return d.toISOString().slice(0, 10);
    }
    // Filter out empty dates and pick max
    const validDates = tripItems.map(t => t.date).filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
    if (validDates.length === 0) {
      const d = new Date();
      return d.toISOString().slice(0, 10);
    }
    const max = new Date(Math.max(...validDates.map(d => d.getTime())));
    return max.toISOString().slice(0, 10);
  };

  // Open the Add Item form with a sensible default date (last day of current trip)
  const openAddForm = () => {
    const defaultDate = getLastItemDateIso();
    setEditingItem(null);
    setNewItem({ date: defaultDate, location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
    setShowAddForm(true);
  };

  // Reorder handler: only allow moving items within the same date group.
  // Expects indices from the sorted view (as TripList/TripTable render sorted lists).
  const handleReorder = (fromIndex, toIndex) => {
    if (typeof fromIndex !== 'number' || typeof toIndex !== 'number') return;
    const sorted = sortTripItems(tripItems);
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= sorted.length || toIndex >= sorted.length) return;
    const fromItem = sorted[fromIndex];
    const toItem = sorted[toIndex];
    if (!fromItem || !toItem) return;
    if ((fromItem.date || '') !== (toItem.date || '')) {
      addToast('Items can only be reordered within the same date', 'warning');
      return;
    }
    // Reorder within the sorted array
    const next = sorted.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    // Compute fractional position for the moved item based on neighbors
    const withinDate = (fromItem.date || '');
    const itemsSameDate = next.filter(i => (i.date || '') === withinDate);
    // find index of moved within the date-group
    const idxInDate = itemsSameDate.findIndex(i => i.id === moved.id);
    const prev = itemsSameDate[idxInDate - 1];
    const nextNeighbor = itemsSameDate[idxInDate + 1];

    const BASE_GAP = 1000;
    const MIN_GAP = 1e-6;
    const computeMid = (p, n) => {
      if (typeof p !== 'number' && typeof n !== 'number') return BASE_GAP;
      if (typeof p !== 'number') return n - BASE_GAP;
      if (typeof n !== 'number') return p + BASE_GAP;
      const gap = n - p;
      if (gap <= MIN_GAP) return null; // signal reindex needed
      return p + gap / 2;
    };

    const newPos = computeMid(prev && prev.position, nextNeighbor && nextNeighbor.position);

    if (newPos === null) {
      // need to reindex whole date group then compute positions again
      const reindex = async () => {
        // assign sequential positions spaced by BASE_GAP
        const byDate = next.filter(i => (i.date || '') === withinDate);
        byDate.sort((a, b) => (a.position || 0) - (b.position || 0));
        const batch = currentTripId ? writeBatch(db) : null;
        const newNext = next.slice();
        for (let i = 0; i < byDate.length; i++) {
          const it = byDate[i];
          const p = (i + 1) * BASE_GAP;
          if (it.position !== p) {
            // update local copy
            const locIdx = newNext.findIndex(x => x.id === it.id);
            if (locIdx !== -1) newNext[locIdx] = { ...newNext[locIdx], position: p };
            if (currentTripId) {
              const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, it.id);
              // eslint-disable-next-line no-console
              console.log('Reindexing (set) position for', it.id, '->', p);
              batch.set(itemDocRef, { position: p }, { merge: true });
            }
          }
        }
        // commit batch if any
        if (currentTripId) {
          try {
            await batch.commit();
          } catch (e) {
            console.error('Failed reindex batch', e);
            pushDebug(`Failed reindex batch: ${e && e.message ? e.message : String(e)}`);
            addToast('Failed to reindex item order remotely', 'warning');
          }
        }
        setTripItems(sortTripItems(newNext));
        addToast('Reindexed items and applied reorder', 'success');
      };
      reindex();
      return;
    }

    // Apply new position to moved item locally and persist
    const updatedNext = next.map(i => i.id === moved.id ? { ...i, position: newPos } : i);
    setTripItems(sortTripItems(updatedNext));

  // Stage the position update and queue a pending op (will be flushed on Save)
  setPendingOps(prev => [...prev, { op: 'update', id: moved.id, payload: { position: newPos } }]);
  addToast('Reorder staged (save to persist)', 'info');
  };

  // Move item up/down within the same date group by item id
  const handleMoveUp = (id) => {
    if (!id) return;
    const sorted = sortTripItems(tripItems);
    const idx = sorted.findIndex(i => i.id === id);
    if (idx <= 0) { addToast('Cannot move up', 'muted'); return; }
    // find previous index with same date
    const date = sorted[idx].date || '';
    let prev = idx - 1;
    while (prev >= 0 && (sorted[prev].date || '') === date) {
      // Found previous in same date
      break;
    }
    if (prev < 0 || (sorted[prev].date || '') !== date) { addToast('Cannot move up within date', 'muted'); return; }
    const next = sorted.slice();
    const [item] = next.splice(idx, 1);
    next.splice(prev, 0, item);

  // compute new fractional position within the same date group
    const itemsSameDate = next.filter(i => (i.date || '') === date);
    const idxInDate = itemsSameDate.findIndex(i => i.id === id);
    const prevNeighbor = itemsSameDate[idxInDate - 1];
    const nextNeighbor = itemsSameDate[idxInDate + 1];
    const BASE_GAP = 1000;
    const MIN_GAP = 1e-6;
    const computeMid = (p, n) => {
      if (typeof p !== 'number' && typeof n !== 'number') return BASE_GAP;
      if (typeof p !== 'number') return n - BASE_GAP;
      if (typeof n !== 'number') return p + BASE_GAP;
      const gap = n - p;
      if (gap <= MIN_GAP) return null;
      return p + gap / 2;
    };
    const newPos = computeMid(prevNeighbor && prevNeighbor.position, nextNeighbor && nextNeighbor.position);
    if (newPos === null) {
      // reuse the same reindex approach as handleReorder
      const withinDate = date;
      const reindex = async () => {
        const byDate = next.filter(i => (i.date || '') === withinDate);
        byDate.sort((a, b) => (a.position || 0) - (b.position || 0));
        const batch = currentTripId ? writeBatch(db) : null;
        const newNext = next.slice();
        for (let i = 0; i < byDate.length; i++) {
          const it = byDate[i];
          const p = (i + 1) * BASE_GAP;
          if (it.position !== p) {
            const locIdx = newNext.findIndex(x => x.id === it.id);
            if (locIdx !== -1) newNext[locIdx] = { ...newNext[locIdx], position: p };
            if (currentTripId) {
              const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, it.id);
              // eslint-disable-next-line no-console
              console.log('Reindexing (set) position for', it.id, '->', p);
              batch.set(itemDocRef, { position: p }, { merge: true });
            }
          }
        }
        if (currentTripId) {
          try { await batch.commit(); } catch (e) { console.error('Failed reindex batch', e); pushDebug(`Failed reindex batch: ${e && e.message ? e.message : String(e)}`); addToast('Failed to reindex item order remotely', 'warning'); }
        }
        setTripItems(sortTripItems(newNext));
        addToast('Reindexed items and moved up', 'success');
      };
      reindex();
      return;
    }

    const updated = next.map(x => x.id === id ? { ...x, position: newPos } : x);
    setTripItems(sortTripItems(updated));
  // Stage move up as pending update
  setPendingOps(prev => [...prev, { op: 'update', id, payload: { position: newPos } }]);
  addToast('Move staged (save to persist)', 'info');
  };

  const handleMoveDown = (id) => {
    if (!id) return;
    const sorted = sortTripItems(tripItems);
    const idx = sorted.findIndex(i => i.id === id);
    if (idx === -1 || idx >= sorted.length - 1) { addToast('Cannot move down', 'muted'); return; }
    const date = sorted[idx].date || '';
    let nextIdx = idx + 1;
    if ((sorted[nextIdx].date || '') !== date) { addToast('Cannot move down within date', 'muted'); return; }
    const next = sorted.slice();
    const [item] = next.splice(idx, 1);
    next.splice(nextIdx, 0, item);

  // compute new fractional position within the same date group
    const itemsSameDate = next.filter(i => (i.date || '') === date);
    const idxInDate = itemsSameDate.findIndex(i => i.id === id);
    const prevNeighbor = itemsSameDate[idxInDate - 1];
    const nextNeighbor = itemsSameDate[idxInDate + 1];
    const BASE_GAP = 1000;
    const MIN_GAP = 1e-6;
    const computeMid = (p, n) => {
      if (typeof p !== 'number' && typeof n !== 'number') return BASE_GAP;
      if (typeof p !== 'number') return n - BASE_GAP;
      if (typeof n !== 'number') return p + BASE_GAP;
      const gap = n - p;
      if (gap <= MIN_GAP) return null;
      return p + gap / 2;
    };
    const newPos = computeMid(prevNeighbor && prevNeighbor.position, nextNeighbor && nextNeighbor.position);
    if (newPos === null) {
      const withinDate = date;
      const reindex = async () => {
        const byDate = next.filter(i => (i.date || '') === withinDate);
        byDate.sort((a, b) => (a.position || 0) - (b.position || 0));
        const batch = currentTripId ? writeBatch(db) : null;
        const newNext = next.slice();
        for (let i = 0; i < byDate.length; i++) {
          const it = byDate[i];
          const p = (i + 1) * BASE_GAP;
          if (it.position !== p) {
            const locIdx = newNext.findIndex(x => x.id === it.id);
            if (locIdx !== -1) newNext[locIdx] = { ...newNext[locIdx], position: p };
            if (currentTripId) {
              const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, it.id);
              // eslint-disable-next-line no-console
              console.log('Reindexing (set) position for', it.id, '->', p);
              batch.set(itemDocRef, { position: p }, { merge: true });
            }
          }
        }
        if (currentTripId) {
          try { await batch.commit(); } catch (e) { console.error('Failed reindex batch', e); addToast('Failed to reindex item order remotely', 'warning'); }
        }
        setTripItems(sortTripItems(newNext));
        addToast('Reindexed items and moved down', 'success');
      };
      reindex();
      return;
    }

    const updated = next.map(x => x.id === id ? { ...x, position: newPos } : x);
    setTripItems(sortTripItems(updated));
  setPendingOps(prev => [...prev, { op: 'update', id, payload: { position: newPos } }]);
  addToast('Move staged (save to persist)', 'info');
  };

  // Demo trip editing logic (add, edit, delete)
  const handleAddItem = () => {
    // Persist the new item to Firestore if a trip is selected, otherwise keep local demo behavior
    const itemToAdd = { ...newItem };
    // Assign a fractional position for ordering: base gap of 1000
    try {
      const BASE_GAP = 1000;
      const sorted = sortTripItems(tripItems || []);
      const dateKey = (itemToAdd.date || '');
      const sameDate = sorted.filter(i => (i.date || '') === dateKey);
      let maxPos = 0;
      for (const it of sameDate) {
        if (typeof it.position === 'number' && !isNaN(it.position)) {
          maxPos = Math.max(maxPos, it.position);
        }
      }
      itemToAdd.position = (maxPos > 0) ? (maxPos + BASE_GAP) : BASE_GAP;
    } catch (e) {
      // defensive: if anything goes wrong, just leave position undefined
    }
    const resetLocal = () => {
      setShowAddForm(false);
      setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
    };
  // Staging: add to local state and queue a pending create op.
  const tempId = `temp_${Math.random().toString(36).slice(2,9)}`;
  const staged = { ...itemToAdd, id: tempId };
  setTripItems(prev => sortTripItems([...prev, staged]));
  setPendingOps(prev => [...prev, { op: 'create', tempId, payload: { ...itemToAdd } }]);
  resetLocal();
  };
  const handleEditClick = (item) => {
    setEditingItem(item);
    setNewItem(item);
    setShowAddForm(true);
  };
  const handleSaveEdit = () => {
    const resetLocal = () => {
      setShowAddForm(false);
      setEditingItem(null);
      setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
    };
    // Stage the edit locally and queue a pending update
    setTripItems(prev => sortTripItems(prev.map(item => item.id === (editingItem && editingItem.id) ? { ...item, ...newItem } : item)));
    if (editingItem && editingItem.id) {
      setPendingOps(prev => [...prev, { op: 'update', id: editingItem.id, payload: { ...newItem } }]);
    }
    resetLocal();
  };
  const handleDeleteItem = (id) => {
  // Stage local deletion and queue a pending delete op
  setTripItems(prev => sortTripItems(prev.filter(item => item.id !== id)));
  setPendingOps(prev => [...prev, { op: 'delete', id }]);
  addToast('Change staged (save to persist to Firestore)', 'info');
  };

  // Omni import consumer: expects payload = [{ entry, action }]
  const handleImportResult = async (payload) => {
    // Support two payload shapes:
    // - Array: [{ entry, action }, ...] (existing behavior)
    // - Object for createNewTrip: { createNewTrip: true, name, isPublic, items: [{ entry, action }] }
    if (!payload) return;
    if (payload && payload.createNewTrip) {
      // Create a new trip and import items into it
      const { name, isPublic, items } = payload;
      try {
        setIsCreatingTrip(true);
        if (userId) {
          const tripsRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips`);
          // Use the current `tripProfile` state as the new trip profile (initialProfile is not available here)
          const tripDoc = { ownerId: userId, name: name || `AI Trip ${new Date().toISOString().slice(0,10)}`, profile: tripProfile, public: !!isPublic, createdAt: Date.now() };
          const newTripRef = await addDoc(tripsRef, tripDoc);
          // Prepare normalized items to add and to show locally
          const newItems = (items || []).map(it => normalizeTripItem(it.entry));
          // add items into itineraryItems subcollection
          const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${newTripRef.id}/itineraryItems`);
          for (const it of newItems) {
            try {
              const payloadItem = stripUndefined({ ...it });
              // Do not send an id field; let Firestore create doc ids
              delete payloadItem.id;
              await addDoc(itineraryRef, payloadItem);
            } catch (e) {
              console.error('Failed to add item to new trip', e);
              addToast('Failed to add one or more items to the new trip', 'warning');
            }
          }

          // Select the new trip. Read back the created docs to avoid snapshot race that can clear UI
          setUserTrips(prev => [...prev, { id: newTripRef.id, ownerId: userId, name: tripDoc.name }]);
          setCurrentTripId(newTripRef.id);

          try {
            const snap = await getDocs(itineraryRef);
            const rawItems = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            const norm = rawItems.map(normalizeTripItem);
            setTripItems(sortTripItems(norm));
            setLastSyncedItems(norm.slice());
            setPendingOps([]);
          } catch (e) {
            console.error('Failed to read back created itinerary items', e);
            // Fallback: use the normalized items we prepared earlier
            setTripItems(sortTripItems(newItems));
            setLastSyncedItems(newItems.slice());
            setPendingOps([]);
          }

          addToast('Created new trip and imported AI suggestions', 'success');
        } else {
          // Not logged in: create a local public-facing trip object and add items locally
          const newTripId = `public_${Date.now()}`;
          const localTrip = { id: newTripId, ownerId: null, name: name || `AI Trip ${new Date().toISOString().slice(0,10)}`, profile: initialProfile || tripProfile, public: !!isPublic };
          setUserTrips(prev => [...prev, localTrip]);
          setCurrentTripId(newTripId);
          // Add items locally into tripItems state
          const newItems = (items || []).map(it => normalizeTripItem(it.entry));
          // Replace demo trip items with the new imported items
          setTripItems(sortTripItems(newItems));
          setPendingOps([]);
          setLastSyncedItems([]);
          addToast('Created public trip (demo) and imported AI suggestions', 'info');
        }
      } catch (e) {
        console.error('Failed to create new trip from AI import', e);
        addToast('Failed to create new trip', 'warning');
      }
      setShowAIImportModal(false);
      setIsCreatingTrip(false);
      return;
    }
    if (!Array.isArray(payload)) return;
    const summary = { created: 0, updated: 0, replaced: 0, errors: 0 };
    // process each item sequentially
    for (const item of payload) {
      const { entry, action } = item;
      if (!entry) continue;
      // normalize incoming entry
      const incoming = normalizeTripItem(entry);

      // find existing local item by date+type
      const existing = tripItems.find(t => t.date === incoming.date && t.type === incoming.type);

      // If incoming is roofed/camp and there's already an existing booking for that date, queue a merge request instead of immediate write
      if ((incoming.type === 'roofed' || incoming.type === 'camp') && existing) {
        // mark existing item locally as pending merge for UI
  setTripItems(prev => sortTripItems(prev.map(t => t.id === existing.id ? { ...t, _pendingMerge: true } : t)));
        setMergeRequests(prev => [...prev, { incoming, existing, action }]);
        // skip further processing for now; user will resolve merge requests
        continue;
      }

      // If we have a selected remote trip and a signed-in user, persist to Firestore.
      if (currentTripId && userId) {
        const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`);
        try {
          // Prepare payload without id so Firestore generates a document id when adding
          const payload = stripUndefined({ ...incoming });
          delete payload.id;
          if (incoming.id) {
            // Try to update an existing document with the provided id; if it doesn't exist, fall back to addDoc
            const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, incoming.id);
            try {
              await updateDoc(itemDocRef, payload);
              summary.updated += 1;
            } catch (updateErr) {
              // update failed (possibly doc doesn't exist) — create a new doc instead
              try {
                await addDoc(itineraryRef, payload);
                summary.created += 1;
              } catch (addErr) {
                console.error('Add failed', addErr);
                summary.errors += 1;
              }
            }
          } else {
            // No id provided: always add as a new document
            try {
              await addDoc(itineraryRef, payload);
              summary.created += 1;
            } catch (addErr) {
              console.error('Add failed', addErr);
              summary.errors += 1;
            }
          }
        } catch (err) {
          console.error('Import to Firestore failed for entry', incoming, err);
          summary.errors += 1;
        }
      } else {
        // Local/demo behavior
        if (existing) {
          if (action === 'replace') {
            // remove existing and add new
            setTripItems(prev => sortTripItems(prev.filter(t => t.id !== existing.id)));
            const newItem = { ...incoming, id: incoming.id || Math.random().toString(36).substr(2, 9) };
            setTripItems(prev => sortTripItems([...prev, newItem]));
            summary.replaced += 1;
          } else {
            // import => merge (incoming overrides)
            setTripItems(prev => sortTripItems(prev.map(t => t.id === existing.id ? { ...t, ...incoming } : t)));
            summary.updated += 1;
          }
        } else {
          // create new local item with id
          const newItem = { ...incoming, id: incoming.id || Math.random().toString(36).substr(2, 9) };
          setTripItems(prev => sortTripItems([...prev, newItem]));
          summary.created += 1;
        }
      }

      // Enforce single roofed/camp per day locally: if incoming is roofed/camp, demote others
      if (incoming.type === 'roofed' || incoming.type === 'camp') {
        // Update local state immediately
        setTripItems(prev => sortTripItems(prev.map(t => {
          if (t.id === incoming.id) return t;
          if (t.date === incoming.date && t.type === incoming.type) {
            return { ...t, status: 'Unconfirmed' };
          }
          return t;
        })));
        // Also try to update remote docs to demote their status where possible
        if (currentTripId) {
          const others = tripItems.filter(t => t.date === incoming.date && t.type === incoming.type && t.id && t.id !== incoming.id);
          for (const other of others) {
            try {
              const otherDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, other.id);
              await updateDoc(otherDocRef, { status: 'Unconfirmed' });
            } catch (e) {
              // not critical
            }
          }
        }
      }
    }
    // Close modal after processing; TripDashboard controls the modal state
    setShowAIImportModal(false);
    // If we wrote to Firestore, read back the itinerary items to ensure UI is up-to-date
    if (currentTripId) {
      try {
        const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`);
        const snap = await getDocs(itineraryRef);
        const rawItems = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        const norm = rawItems.map(normalizeTripItem);
        setTripItems(sortTripItems(norm));
        setLastSyncedItems(norm.slice());
      } catch (e) {
        console.error('Failed to refresh itinerary items after import', e);
      }
    }
    // show toast summary
    addToast(`Import complete — created: ${summary.created}, updated: ${summary.updated}, replaced: ${summary.replaced}, errors: ${summary.errors}`, 'success');
  };

  // Resolve merge requests from the modal
  const handleResolveMergeRequest = async (resolution, req) => {
    setMergeRequests(prev => prev.filter(r => r !== req));
    const { incoming, existing } = req;
    if (resolution === 'skip') {
      // clear pending flag
  setTripItems(prev => sortTripItems(prev.map(t => t.id === existing.id ? { ...t, _pendingMerge: false } : t)));
      addToast('Skipped incoming booking', 'muted');
      return;
    }
    if (resolution === 'replace') {
      // remove existing and add incoming
      // perform remote update if trip exists
      if (currentTripId) {
        try {
          const existingDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, existing.id);
          await deleteDoc(existingDocRef);
          const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`);
          const payload = stripUndefined({ ...incoming }); delete payload.id; await addDoc(itineraryRef, payload);
          // Invalidate adjacent segments touching the replaced item
          try { await invalidateSegmentsForItem(currentTripId, existing.id, null, null); } catch (e) { /* ignore */ }
        } catch (e) {
          console.error('Remote replace failed', e);
          addToast('Remote replace failed — check network', 'warning');
        }
      }
  setTripItems(prev => sortTripItems(prev.filter(t => t.id !== existing.id).concat([incoming])));
      addToast('Replaced existing booking with incoming', 'success');
      return;
    }
    if (resolution === 'merge') {
      // merge: prefer incoming when present
      const merged = { ...existing, ...incoming };
      if (currentTripId) {
        try {
          const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, existing.id);
          await updateDoc(itemDocRef, { ...merged });
          // invalidate adjacent segments touching this item
          try { await invalidateSegmentsForItem(currentTripId, existing.id, null, null); } catch (e) { /* ignore */ }
        } catch (e) {
          console.error('Remote merge failed', e);
          addToast('Remote merge failed — check network', 'warning');
        }
      }
  setTripItems(prev => sortTripItems(prev.map(t => t.id === existing.id ? { ...merged, _pendingMerge: false } : t)));
      addToast('Merged incoming booking', 'success');
      return;
    }
  };

  // Auth listener: update userEmail/avatar when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email || null);
        // try to pull a photoURL if available
        setUserAvatar(user.photoURL || null);
        setUserId(user.uid || null);
      } else {
        setUserEmail(null);
        setUserAvatar(null);
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // When userId changes, fetch their trips; otherwise show demo tripItems
  useEffect(() => {
    if (!userId) {
      setUserTrips([]);
      return;
    }
    const tripsRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips`);
    const q = query(tripsRef, where('ownerId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUserTrips(tripList);
      if (tripList.length > 0 && !currentTripId) {
        setCurrentTripId(tripList[0].id);
      }
      // If the user has no trips, create a demo trip pre-populated with default data
      if (tripList.length === 0) {
        (async () => {
          try {
            const demoTrip = {
              ownerId: userId,
              name: 'Demo trip - Tasmania',
              profile: tripProfile,
              createdAt: Date.now()
            };
            const newTripRef = await addDoc(tripsRef, demoTrip);
            // add default itinerary items to the trip's itineraryItems subcollection
            const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${newTripRef.id}/itineraryItems`);
            for (const rawItem of defaultTasmaniaTripDataRaw) {
              const itemToAdd = { ...rawItem, profile: tripProfile };
              try {
                const payload = stripUndefined({ ...itemToAdd }); delete payload.id; await addDoc(itineraryRef, payload);
              } catch (e) {
                // ignore individual item failures
              }
            }
            // select the new trip
            setCurrentTripId(newTripRef.id);
            addToast('Created demo trip for you', 'info');
          } catch (e) {
            console.error('Failed to create demo trip for new user', e);
          }
        })();
      }
    }, (err) => {
      console.error('Trips snapshot error', err);
    });
    return () => unsubscribe();
  }, [userId]);

  // When currentTripId changes, load its itinerary items
  useEffect(() => {
    if (!currentTripId) return;
    // If this is a guest/demo-created trip (local id starting with 'public_') and user is not authenticated,
    // do not attach a Firestore onSnapshot which would overwrite the local items (no remote docs exist).
    if (!userId && String(currentTripId).startsWith('public_')) {
      // local/demo trip: keep existing local tripItems (already set when creating the demo trip)
      return;
    }
    const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`);
    const unsubscribe = onSnapshot(itineraryRef, (snapshot) => {
      (async () => {
        try {
          // Prefer the Firestore-generated document id as the canonical id.
          // Avoid overwriting it with any `id` field stored inside the document data
          // which previously caused seeding to write to incorrect/new doc ids.
          const rawItems = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          // Normalize items first
          const norm = rawItems.map(normalizeTripItem);
          // Group by date and find groups that need seeding (missing numeric position on any item)
          const groups = {};
          for (const it of norm) {
            const k = it.date || '';
            groups[k] = groups[k] || [];
            groups[k].push(it);
          }
          const BASE_GAP = 1000;
          const toSeed = [];
          for (const k of Object.keys(groups)) {
            const group = groups[k];
            // If any item in group lacks a numeric position, we'll seed the whole group
            const needs = group.some(g => typeof g.position !== 'number');
            if (needs) toSeed.push({ date: k, items: group });
          }

          const updatedLocal = norm.slice();
          // We'll always compute and persist a canonical displayIndex per item so views can show stable numbers.
          // Prepare a batch if we need to write position or displayIndex changes.
          let batch = null;
          let haveWrites = false;
          if (currentTripId) batch = writeBatch(db);

          if (toSeed.length > 0) {
            // Batch update positions for groups that need seeding
            for (const g of toSeed) {
              // Sort existing by id stable order then assign positions
              g.items.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
              for (let i = 0; i < g.items.length; i++) {
                const it = g.items[i];
                const p = (i + 1) * BASE_GAP;
                // Update local copy
                const locIdx = updatedLocal.findIndex(x => x.id === it.id);
                if (locIdx !== -1) updatedLocal[locIdx] = { ...updatedLocal[locIdx], position: p };
                if (currentTripId) {
                  const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, it.id);
                  // eslint-disable-next-line no-console
                  console.log('Seeding position for', it.id, '->', p);
                  batch.set(itemDocRef, { position: p }, { merge: true });
                  haveWrites = true;
                }
              }
            }
          }

          // Now compute canonical displayIndex for the whole trip (sorted globally). Persist when missing or different.
          const sortedForIndex = sortTripItems(updatedLocal);
          for (let i = 0; i < sortedForIndex.length; i++) {
            const it = sortedForIndex[i];
            const desired = i + 1;
            const locIdx = updatedLocal.findIndex(x => x.id === it.id);
            if (locIdx !== -1 && updatedLocal[locIdx].displayIndex !== desired) {
              updatedLocal[locIdx] = { ...updatedLocal[locIdx], displayIndex: desired };
              if (currentTripId) {
                const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, it.id);
                batch.set(itemDocRef, { displayIndex: desired }, { merge: true });
                haveWrites = true;
              }
            }
          }

          if (haveWrites && currentTripId) {
            try {
              await batch.commit();
              addToast('Seeded ordering positions and display indices for trip', 'info');
            } catch (e) {
              console.error('Failed to seed positions/displayIndex', e);
              addToast('Could not seed ordering/display indices remotely', 'warning');
            }
          }

          setTripItems(sortTripItems(updatedLocal));
          const found = userTrips.find(t => t.id === currentTripId);
          setCurrentTripName(found ? found.name || null : null);
        } catch (err) {
          console.error('Itinerary snapshot processing failed', err);
        }
      })();
    }, (err) => {
      console.error('Itinerary snapshot error', err);
    });
    return () => unsubscribe();
  }, [currentTripId, userTrips]);

  const handleProfileLogin = () => {
    setShowLoginModal(true);
  };

  const handleProfileLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out failed', err);
    }
  };

  const handleProfileChangeTrip = () => {
    setShowTripSelectModal(true);
  };

  const handleProfileAddTrip = () => {
    setShowTripCreateModal(true);
  };

  const discardPendingChanges = () => {
    // Reload last synced items (if present) otherwise refetch by clearing currentTripId briefly
    if (lastSyncedItems && lastSyncedItems.length > 0) {
      setTripItems(sortTripItems(lastSyncedItems));
    }
    setPendingOps([]);
    addToast('Discarded staged changes', 'muted');
  };

  // Called by TripMap when travel time/distance or coordinates are computed.
  const handleUpdateTravelTime = (itemId, duration, distance, coords) => {
    if (!itemId) return;
    // Update local UI immediately
    setTripItems(prev => prev.map(it => it.id === itemId ? { ...it, travelTime: duration || it.travelTime, distance: distance || it.distance, coords: coords || it.coords } : it));
    // Stage a pending update (merge into any existing pending update for this id)
    setPendingOps(prev => {
      const next = prev.slice();
      const idx = next.findIndex(p => p.op === 'update' && p.id === itemId);
      const payload = stripUndefined({ ...(duration ? { travelTime: duration } : {}), ...(distance ? { distance } : {}), ...(coords ? { coords } : {}) });
      if (Object.keys(payload).length === 0) return prev;
      if (idx !== -1) {
        next[idx] = { ...next[idx], payload: { ...next[idx].payload, ...payload } };
      } else {
        next.push({ op: 'update', id: itemId, payload });
      }
      return next;
    });
  };

  // Compute travelTime/distance for the trip using Google Directions API (browser-side) and persist results.
  const computeAndPersistTravelTimes = async (tripId, items) => {
    if (!tripId || !Array.isArray(items) || items.length < 2) return;
    if (typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.DirectionsService) {
      pushDebug('Google Maps API not available in this context; skipping travel time computation');
      return;
    }
    try {
      const validLocations = items.filter(it => it.type !== 'note').map(i => i.location).filter(Boolean);
      if (validLocations.length < 2) return;
      const directionsService = new window.google.maps.DirectionsService();
      const waypoints = validLocations.slice(1, -1).map(location => ({ location, stopover: true }));
      const request = {
        origin: validLocations[0],
        destination: validLocations[validLocations.length - 1],
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC
      };
      const result = await new Promise((resolve, reject) => directionsService.route(request, (res, status) => status === 'OK' ? resolve(res) : reject(new Error(`Directions failed: ${status}`))));
      if (!result || !result.routes || !result.routes[0] || !result.routes[0].legs) return;
      const legs = result.routes[0].legs;
      // Map legs to destination locations: legs[i] corresponds to destination validLocations[i+1]
      const updates = [];
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        const destLocation = validLocations[i + 1];
        const tripItem = items.find(it => (it.location || '') === (destLocation || ''));
        if (!tripItem) continue;
        const duration = leg.duration && leg.duration.text ? leg.duration.text : '';
        const distance = leg.distance && leg.distance.text ? leg.distance.text : '';
        updates.push({ id: tripItem.id, duration, distance });
      }
      if (updates.length === 0) return;
      // Persist to Firestore (batch)
      if (tripId && userId) {
        const batch2 = writeBatch(db);
        for (const u of updates) {
          const targetId = u.id;
          if (!targetId) continue;
          const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${tripId}/itineraryItems`, targetId);
          batch2.set(itemDocRef, stripUndefined({ travelTime: u.duration, distance: u.distance }), { merge: true });
        }
        try {
          await batch2.commit();
          pushDebug('Persisted travel time updates for trip ' + tripId);
          addToast('Updated estimated travel times', 'success');
        } catch (e) {
          console.error('Failed to persist travel time updates', e);
          pushDebug('Failed to persist travel time updates: ' + e.message);
          addToast('Could not persist travel time updates remotely', 'warning');
        }
      } else {
        // Demo mode: update local state and localStorage
        const updatedLocal = (tripItems || []).map(it => {
          const found = updates.find(u => u.id === it.id);
          return found ? { ...it, travelTime: found.duration, distance: found.distance } : it;
        });
        setTripItems(sortTripItems(updatedLocal));
        try { localStorage.setItem('tripDraft:local', JSON.stringify({ tripItems: updatedLocal, pendingOps: [] })); } catch (e) {}
        addToast('Updated estimated travel times (local)', 'success');
      }
    } catch (err) {
      console.error('computeAndPersistTravelTimes failed', err);
      pushDebug('computeAndPersistTravelTimes failed: ' + (err && err.message ? err.message : String(err)));
    }
  };

  const savePendingChanges = async () => {
    if (!currentTripId || !userId) {
      // Offline/demo save: persist staged changes to localStorage so the Save button is usable
      try {
        const draftKey = currentTripId ? `tripDraft:${currentTripId}` : 'tripDraft:local';
        const draft = { tripItems: (tripItems || []).slice(), pendingOps: (pendingOps || []).slice(), savedAt: Date.now() };
        try { localStorage.setItem(draftKey, JSON.stringify(draft)); } catch (e) { /* some environments may block localStorage */ }
  setLastSyncedItems(tripItems.slice());
  setPendingOps([]);
  addToast('Saved staged changes locally (not persisted to Firestore). Sign in to sync remotely.', 'success');
      try {
        // For newly created items we have temp_ ids locally; remap them to real ids returned by addDoc
        const itemsForCompute = tripItems.map(it => ({ ...it, id: (it.id && it.id.startsWith('temp_') ? (tempToReal[it.id] || it.id) : it.id) }));
        computeAndPersistTravelTimes(currentTripId, itemsForCompute);
      } catch (e) { /* ignore */ }
      } catch (e) {
        console.error('Failed to save staged changes locally', e);
        addToast('Failed to save staged changes locally', 'warning');
      }
      setIsSaving(false);
      return;
    }
    if (!hasPending()) { addToast('No staged changes', 'muted'); return; }
    setIsSaving(true);
    try {
      const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`);
  const creates = pendingOps.filter(p => p.op === 'create');
  const updates = pendingOps.filter(p => p.op === 'update');
  const deletes = pendingOps.filter(p => p.op === 'delete');
  const tripDeletes = pendingOps.filter(p => p.op === 'trip-delete');
  const tripShares = pendingOps.filter(p => p.op === 'trip-share');

    // Compute canonical displayIndex from current local sorted tripItems
    const canonicalSorted = sortTripItems(tripItems || []);
    const displayMap = {};
    for (let i = 0; i < canonicalSorted.length; i++) displayMap[canonicalSorted[i].id] = i + 1;

    // First perform creates (addDoc) and map tempIds -> realIds
      const tempToReal = {};
      for (const c of creates) {
  // Build a normalized payload with automated fields (titleLink, activityLink, discoverImages, position numeric)
  const stagedLocal = tripItems.find(t => t.id === c.tempId) || {};
  // Merge staged local (which may contain assigned position) with the payload from pending op
  const mergedForNormalize = { ...stagedLocal, ...c.payload };
  // Inject displayIndex if available for this tempId (computed from local order)
  if (!mergedForNormalize.displayIndex) mergedForNormalize.displayIndex = displayMap[c.tempId] || undefined;
  const normalized = normalizeTripItem(mergedForNormalize);
  // Ensure displayIndex is included if present
  if (typeof mergedForNormalize.displayIndex === 'number') normalized.displayIndex = mergedForNormalize.displayIndex;
  const payload = stripUndefined({ ...normalized }); delete payload.id;
  const docRef = await addDoc(itineraryRef, payload);
  tempToReal[c.tempId] = docRef.id;
      }

      // Batch updates and deletes
      const batch = writeBatch(db);
      for (const u of updates) {
        const targetId = u.id && u.id.startsWith('temp_') ? (tempToReal[u.id] || null) : u.id;
        if (!targetId) continue;
  const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, targetId);
  // For updates, merge with current local item to compute automated fields
  const localItem = tripItems.find(t => t.id === u.id) || (u.id && u.id.startsWith('temp_') ? (tripItems.find(t => t.id === (tempToReal[u.id] || u.id)) || {}) : {});
  const baseForNormalize = { ...localItem, ...(u.payload || {}) };
  // Ensure displayIndex is preserved/updated according to local ordering
  if (!baseForNormalize.displayIndex) baseForNormalize.displayIndex = displayMap[u.id] || undefined;
  const normalizedUpdate = normalizeTripItem(baseForNormalize);
  if (typeof baseForNormalize.displayIndex === 'number') normalizedUpdate.displayIndex = baseForNormalize.displayIndex;
  batch.set(itemDocRef, stripUndefined(normalizedUpdate), { merge: true });
      }
      for (const d of deletes) {
        const targetId = d.id && d.id.startsWith('temp_') ? (tempToReal[d.id] || null) : d.id;
        if (!targetId) continue;
        const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, targetId);
        batch.delete(itemDocRef);
      }
      await batch.commit();

      // Invalidate adjacent route segments for items affected by pending ops
      try {
        const affected = pendingOps.filter(p => ['create', 'update', 'delete'].includes(p.op));
        const invalidateCalls = [];
        for (const p of affected) {
          // resolve final id (map temp -> real if needed)
          let finalId = p.id || null;
          if (!finalId && p.tempId) finalId = tempToReal[p.tempId] || null;
          if (!finalId && p.op === 'create') {
            // created without temp mapping? skip
            continue;
          }
          // find index in canonicalSorted (which contains temp ids prior to mapping)
          const findIdInSorted = (id) => {
            if (!id) return -1;
            return canonicalSorted.findIndex(it => (it.id === id) || (it.id && id && id.startsWith('temp_') && it.id === id));
          };
          // Build a normalized view of sorted ids where temp ids are left as-is; find index using either temp or final
          let idx = findIdInSorted(finalId);
          if (idx === -1 && p.tempId) idx = findIdInSorted(p.tempId);
          if (idx === -1) {
            // try matching by displayIndex or title fallback
            idx = canonicalSorted.findIndex(it => it.id === finalId || it.id === p.tempId);
          }
          const prev = (idx > 0 && canonicalSorted[idx - 1]) ? (canonicalSorted[idx - 1].id) : null;
          const next = (idx !== -1 && idx < canonicalSorted.length - 1 && canonicalSorted[idx + 1]) ? (canonicalSorted[idx + 1].id) : null;
          // map prev/next temp ids to real ids if necessary
          const mapId = (id) => (id && id.startsWith('temp_') ? (tempToReal[id] || null) : id);
          const prevFinal = mapId(prev);
          const nextFinal = mapId(next);
          if (finalId) {
            invalidateCalls.push(invalidateSegmentsForItem(currentTripId, finalId, prevFinal, nextFinal));
          }
        }
        try { await Promise.all(invalidateCalls); } catch (e) { /* ignore */ }
      } catch (e) { console.warn('Failed to invalidate segments after save', e); }

        // Process trip-share operations (update trip doc with sharedWith entries)
        for (const s of tripShares) {
          try {
            const tripDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips`, s.tripId);
            await updateDoc(tripDocRef, { sharedWith: arrayUnion(s.payload) });
          } catch (e) {
            console.error('Failed to apply trip share', e);
          }
        }

        // Process trip deletes (delete trip and its items)
        for (const td of tripDeletes) {
          try {
            // delete itinerary items first
            const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${td.tripId}/itineraryItems`);
            const snap = await getDocs(itineraryRef);
            const docs = snap.docs || [];
            const chunkSize = 400;
            for (let i = 0; i < docs.length; i += chunkSize) {
              const b = writeBatch(db);
              const slice = docs.slice(i, i + chunkSize);
              for (const d of slice) b.delete(doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${td.tripId}/itineraryItems`, d.id));
              await b.commit();
            }
            // delete trip doc
            await deleteDoc(doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips`, td.tripId));
          } catch (e) {
            console.error('Failed to delete trip during save', e);
          }
        }

  addToast('Saved staged changes to Firestore', 'success');
  setPendingOps([]);
  // trigger reload: we'll let onSnapshot update local items, but keep a snapshot backup
  setLastSyncedItems(tripItems.slice());
  try { computeAndPersistTravelTimes(currentTripId, tripItems); } catch (e) { /* ignore */ }
    } catch (e) {
      console.error('Failed to save staged changes', e);
      pushDebug(`Failed to save staged changes: ${e && e.message ? e.message : String(e)}`);
      addToast('Failed to save staged changes remotely', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTripSelect = (trip) => {
    if (trip && trip.id) setCurrentTripId(trip.id);
  };

  // Stage a trip delete (will be persisted only when Save changes is clicked)
  const handleStageDeleteTrip = (trip) => {
    if (!trip || !trip.id) return;
    if (!userId) { addToast('Sign in to stage deletions', 'warning'); return; }
    if (trip.ownerId !== userId) { addToast('Only the trip owner can delete this trip', 'warning'); return; }
    if (!window.confirm(`Stage delete of trip "${trip.name || trip.id}"? Click OK to stage (Save to apply).`)) return;
    setPendingOps(prev => [...prev, { op: 'trip-delete', tripId: trip.id, name: trip.name || trip.id }]);
    addToast('Trip delete staged (click Save changes to apply)', 'info');
  };

  // Open share modal for a given trip (sharing is staged via modal)
  const handleOpenShareModal = (trip) => {
    if (!trip || !trip.id) return;
    if (!userId) { addToast('Sign in to stage shares', 'warning'); return; }
    if (trip.ownerId !== userId) { addToast('Only the trip owner can share this trip', 'warning'); return; }
    setSelectedTripForShare(trip);
    setShowShareModal(true);
  };

  const stageShareTrip = (tripId, principal, permission) => {
    if (!tripId || !principal) return;
    setPendingOps(prev => [...prev, { op: 'trip-share', tripId, payload: { principal, permission } }]);
    addToast('Trip share staged (click Save changes to apply)', 'info');
  };

  const handleTripCreated = (trip) => {
    if (trip && trip.id) {
      // refresh the list — quick approach: add to local userTrips and select
      setUserTrips(prev => [...prev, trip]);
      setCurrentTripId(trip.id);
    }
  };

  // Handle loading an exported trip JSON (profile + items)
  const handleImportProfileLoad = async (data) => {
    if (!data || typeof data !== 'object') return;
    const p = data.profile || {};
    const items = Array.isArray(data.items) ? data.items.map(normalizeTripItem) : [];
  // Update local state
  setTripProfile(p);
  setTripItems(sortTripItems(items));
    addToast('Loaded trip JSON into local demo', 'success');

    // Persist to Firestore if user has selected a trip
    if (currentTripId) {
      try {
        // update trip doc profile
        const tripDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips`, currentTripId);
        await updateDoc(tripDocRef, { profile: p });
        // replace itinerary items: delete all then add new ones
        const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`);
        // fetch existing docs and delete them
        // Note: this approach assumes lightweight trips; for large trips consider batched deletes
        const snapshot = await (async () => {
          const s = await new Promise((resolve, reject) => {
            try {
              const q = query(itineraryRef);
              onSnapshot(q, (snap) => resolve(snap), (err) => reject(err));
            } catch (e) {
              reject(e);
            }
          });
          return s;
        })();
        for (const d of snapshot.docs) {
          try {
            await deleteDoc(doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, d.id));
          } catch (e) {
            // ignore
          }
        }
        // Invalidate all route segments for this trip (they will be recomputed on next map render)
        try {
          const segRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/routeSegments`);
          const segSnap = await getDocs(segRef);
          if (segSnap && segSnap.docs && segSnap.docs.length > 0) {
            const chunk = 400;
            for (let i = 0; i < segSnap.docs.length; i += chunk) {
              const b = writeBatch(db);
              const slice = segSnap.docs.slice(i, i + chunk);
              for (const s of slice) b.delete(doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/routeSegments`, s.id));
              await b.commit();
            }
          }
        } catch (e) { /* ignore */ }
        for (const it of items) {
          try {
            const payload = stripUndefined({ ...it }); delete payload.id; await addDoc(itineraryRef, payload);
          } catch (e) {
            // ignore
          }
        }
        addToast('Replaced trip itinerary in Firestore', 'success');
      } catch (e) {
        console.error('Failed to persist imported trip JSON remotely', e);
        addToast('Could not fully persist trip JSON remotely', 'warning');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-[60vh]">
      {isCreatingTrip && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-4 rounded shadow flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
            <div className="text-sm font-medium">Creating trip and importing items…</div>
          </div>
        </div>
      )}
      <AppHeader
        userEmail={userEmail}
        userAvatar={userAvatar}
        activeView={activeView}
        setActiveView={setActiveView}
        onAddStop={() => openAddForm()}
        onAIImport={() => setShowAIImportModal(true)}
        onHelpClick={() => setShowHelp(true)}
        onProfileLogin={handleProfileLogin}
        onProfileLogout={handleProfileLogout}
        onProfileChangeTrip={handleProfileChangeTrip}
        onProfileAddTrip={handleProfileAddTrip}
      />
      {/* Profile Modals */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLoginSuccess={() => setShowLoginModal(false)} />
      <TripSelectModal isOpen={showTripSelectModal} onClose={() => setShowTripSelectModal(false)} userId={userId} onTripSelect={(trip) => { handleTripSelect(trip); setShowTripSelectModal(false); }} onDelete={handleStageDeleteTrip} onShare={handleOpenShareModal} />

      {/* Trip Share Modal (staged) */}
      {showShareModal && selectedTripForShare && (
        <TripShareModal isOpen={showShareModal} onClose={() => { setShowShareModal(false); setSelectedTripForShare(null); }} trip={selectedTripForShare} onShare={(principal, permission) => { stageShareTrip(selectedTripForShare.id, principal, permission); setShowShareModal(false); setSelectedTripForShare(null); }} />
      )}
      <TripCreateModal isOpen={showTripCreateModal} onClose={() => setShowTripCreateModal(false)} userId={userId} onTripCreated={(trip) => { handleTripCreated(trip); setShowTripCreateModal(false); }} />
      {/* Summary/Header Area + Tabbed View Switcher */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <div className="flex items-center gap-3">
            {!editingTripName ? (
              <>
                <h2 className="text-2xl font-bold text-indigo-700 tracking-tight">{displayTripName}</h2>
                {/* debug: show computed name (remove in prod) */}
                <div className="text-xs text-gray-400">Debug name: {displayTripName}</div>
                <button title="Edit trip" className="text-indigo-500 hover:text-indigo-700" onClick={() => { setShowProfileModal(true); setShowTripSelectModal(true); }} aria-label="Edit trip">✎</button>
              </>
            ) : (
              <form onSubmit={async (e) => { e.preventDefault(); try {
                const newName = editTripNameValue && editTripNameValue.trim() ? editTripNameValue.trim() : (currentTripName || 'Trip');
                setEditingTripName(false);
                setCurrentTripName(newName);
                // Persist change remotely for authenticated users, or locally for public trips
                if (userId && currentTripId && !String(currentTripId).startsWith('public_')) {
                  try {
                    await updateDoc(doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips`, currentTripId), { name: newName });
                    setUserTrips(prev => prev.map(t => t.id === currentTripId ? { ...t, name: newName } : t));
                    addToast('Trip name updated', 'success');
                  } catch (err) {
                    console.error('Failed to update trip name remotely', err);
                    addToast('Could not update trip name remotely', 'warning');
                  }
                } else {
                  // local public trip: update userTrips and persist to localStorage
                  setUserTrips(prev => prev.map(t => t.id === currentTripId ? { ...t, name: newName } : t));
                  try { localStorage.setItem(`tripMeta:${currentTripId}`, JSON.stringify({ name: newName })); } catch (e) {}
                  addToast('Updated local public trip name', 'success');
                }
              } catch (e) { console.error(e); } }} className="flex items-center gap-2">
                <input value={editTripNameValue} onChange={e => setEditTripNameValue(e.target.value)} placeholder="Trip name" className="border px-2 py-1 rounded" />
                <button type="submit" className="px-2 py-1 bg-indigo-600 text-white rounded">Save</button>
                <button type="button" className="px-2 py-1 border rounded" onClick={() => { setEditingTripName(false); setEditTripNameValue(''); }}>Cancel</button>
              </form>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => savePendingChanges()} disabled={!hasPending() || isSaving} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm disabled:opacity-50">{isSaving ? 'Saving...' : 'Save changes'}</button>
            <button onClick={() => discardPendingChanges()} disabled={!hasPending() || isSaving} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm disabled:opacity-50">Discard staged</button>
            {hasPending() && (
              <button onClick={() => setShowStagedModal(true)} className="text-xs text-gray-500 ml-2 underline">Staged changes: {pendingOps.length}</button>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="text-gray-500 text-sm">Plan, organize, and visualize your trip</div>
            {userId ? (
              <button onClick={() => setShowProfileModal(true)} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Your trips{displayTripName ? `: ${displayTripName}` : ''}</button>
            ) : (
              <button onClick={() => setShowProfileModal(true)} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Demo trip</button>
            )}
          </div>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1">
  {activeView === 'itinerary' && <TripTable tripItems={tripItems} handleEditClick={handleEditClick} handleDeleteItem={handleDeleteItem} handleReorder={handleReorder} handleMoveUp={handleMoveUp} handleMoveDown={handleMoveDown} />}
  {activeView === 'list' && <TripList tripItems={tripItems} handleEditClick={handleEditClick} handleDeleteItem={handleDeleteItem} handleReorder={handleReorder} handleMoveUp={handleMoveUp} handleMoveDown={handleMoveDown} />}
  {activeView === 'map' && <TripMap tripItems={tripItems} currentTripId={currentTripId} onUpdateTravelTime={handleUpdateTravelTime} onAddItem={(item) => {
        // Accept minimal item { location, title, type, date }
        try {
          setNewItem(prev => ({ ...prev, ...item, title: item.title || item.location }));
          // open add form so user can confirm and set date/type if needed
          setShowAddForm(true);
        } catch (e) { console.error('onAddItem wrapper failed', e); }
      }} />}
  {/* Discover view temporarily hidden while Unsplash account is in review */}
      </div>
      {/* Bottom Navigation for mobile */}
      <div className="md:hidden mt-4">
        <BottomNav activeView={activeView} setActiveView={setActiveView} />
      </div>
      {/* Modals (stubbed) */}
      {showStagedModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-4 rounded shadow max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Staged changes ({pendingOps.length})</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(pendingOps, null, 2)); addToast('Copied staged JSON to clipboard', 'info'); }} className="px-2 py-1 bg-gray-100 rounded text-sm">Copy JSON</button>
                <button onClick={() => { if (window.confirm('Discard all staged changes?')) { setPendingOps([]); addToast('Discarded staged changes', 'muted'); setShowStagedModal(false); } }} className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">Discard all</button>
                <button onClick={() => setShowStagedModal(false)} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">Close</button>
              </div>
            </div>
            <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">{JSON.stringify(pendingOps, null, 2)}</pre>
          </div>
        </div>
      )}
  <AIImportModal isOpen={showAIImportModal} onClose={() => setShowAIImportModal(false)} onImportSuccess={handleImportResult} onError={msg => alert(msg)} initialProfile={tripProfile} />
  <MergeRequestModal requests={mergeRequests} onResolve={handleResolveMergeRequest} onClose={() => setMergeRequests([])} />
  <TripProfileModal isOpen={showProfileModal} profile={tripProfile} tripItems={tripItems} userTrips={userTrips} userId={userId} currentTripId={currentTripId} onLoad={handleImportProfileLoad} onClose={() => setShowProfileModal(false)} onCreate={() => setShowTripCreateModal(true)} onSelect={(trip) => { handleTripSelect(trip); setShowProfileModal(false); }} onDelete={(trip) => handleStageDeleteTrip(trip)} onShare={(trip) => handleOpenShareModal(trip)} onSave={(p) => {
    // update in-memory profile first
    setTripProfile(p);
        // Persist profile: for authenticated users, write to Firestore; for guests, persist locally
        if (currentTripId) {
          if (userId) {
            (async () => {
              try {
                const tripDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips`, currentTripId);
                await updateDoc(tripDocRef, { profile: p });
                addToast('Saved trip profile to trip settings', 'success');
              } catch (e) {
                console.error('Failed to persist trip profile', e);
                addToast('Could not save profile remotely — saved locally only', 'warning');
              }
            })();
          } else {
            try {
              // If currentTripId is a local public trip, ensure it's present in userTrips and persist profile locally
              const isLocalPublic = String(currentTripId).startsWith('public_');
              if (isLocalPublic) {
                const found = userTrips.find(t => t.id === currentTripId);
                if (!found) {
                  const localTrip = { id: currentTripId, ownerId: null, name: 'Public trip', public: true, createdAt: Date.now(), profile: p };
                  setUserTrips(prev => [...prev, localTrip]);
                } else {
                  // update profile on the local userTrips array
                  setUserTrips(prev => prev.map(t => t.id === currentTripId ? { ...t, profile: p } : t));
                }
              }
              // Persist profile draft to localStorage keyed by trip id
              try { localStorage.setItem(`tripProfile:${currentTripId}`, JSON.stringify(p)); } catch (e) { /* ignore */ }
              setTripProfile(p);
              addToast('Saved trip profile locally (public)', 'success');
            } catch (e) {
              console.error('Failed to persist profile locally', e);
              addToast('Could not save profile locally', 'warning');
            }
          }
        }
        // After persisting the profile, regenerate title/activity links for all items so they reflect the new profile
        try {
          const regenerated = (Array.isArray(tripItems) ? tripItems : []).map(it => normalizeTripItem({ ...it, profile: p }));
          setTripItems(sortTripItems(regenerated));
        } catch (err) {
          console.error('Failed to regenerate trip links after profile save', err);
          pushDebug(`Failed to regenerate trip links: ${err && err.message ? err.message : String(err)}`);
        }
      }} />
      <TripHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
  {/* Add/Edit Trip Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-0 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10"
              onClick={() => {
                setShowAddForm(false);
                setEditingItem(null);
                setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
              }}
              aria-label="Close"
            >
              ×
            </button>
            <TripForm
              newItem={newItem}
              handleInputChange={e => setNewItem(prev => ({ ...prev, [e.target.name]: e.target.value }))}
              onAddItem={handleAddItem}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => {
                setShowAddForm(false);
                setEditingItem(null);
                setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
              }}
              openModal={msg => alert(msg)}
              isEditing={!!editingItem}
            />
          </div>
        </div>
      )}
      {/* Temporary Debug Panel removed from UI (kept component for dev use) */}
    </div>
  );
}

// DebugPanel removed

