
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, addDoc, updateDoc, deleteDoc, onSnapshot, doc, where, writeBatch } from 'firebase/firestore';
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
  const [tripProfile, setTripProfile] = useState({ adults: 2, children: 0, interests: [], diet: 'everything' });
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
        const baseUrl = 'https://www.booking.com/searchresults.html';
  const searchLocation = `${cityName}, ${state}, ${country}`;
        const params = new URLSearchParams({
          ss: searchLocation,
          checkin: `${checkinYear}-${String(checkinMonth).padStart(2, '0')}-${String(checkinDay).padStart(2, '0')}`,
          checkout: `${checkoutYear}-${String(checkoutMonth).padStart(2, '0')}-${String(checkoutDay).padStart(2, '0')}`,
          group_adults: String(adults),
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
      const baseUrl = 'https://www.booking.com/searchresults.html';
      const params = new URLSearchParams({
        ss: title,
        checkin: `${checkinYear}-${String(checkinMonth).padStart(2, '0')}-${String(checkinDay).padStart(2, '0')}`,
        checkout: `${checkoutYear}-${String(checkoutMonth).padStart(2, '0')}-${String(checkoutDay).padStart(2, '0')}`,
        group_adults: String(adults),
        group_children: String(children || 0)
      });
      return `${baseUrl}?${params.toString()}`;
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
  // titleLink: only for roofed or camp items (links to booking/search for accommodation)
  // titleLink: build from the title when available (search by title for stays/enroute)
  titleLink: (item.type === 'roofed' || item.type === 'camp') ? (item.titleLink || generateTitleLink(item.title || '', item.type, item.location, item.date, adults, children, tripSettings)) : (item.type === 'enroute' ? (item.titleLink || generateTitleLink(item.title || '', item.type, item.location, item.date, adults, children, tripSettings)) : ''),
  // activityLink: use location-based searches for activity suggestions for all types except 'note'
  activityLink: (item.type && item.type !== 'note') ? (item.activityLink || generateActivityLink(item.type || 'enroute', item.location, item.date, adults, children, tripSettings)) : '',
      discoverImages: discoverImagesForLocation(item.location),
      // fractional ordering position (optional). Keep numeric when present.
      position: (typeof item.position === 'number') ? item.position : (item.position ? parseFloat(item.position) : undefined)
    };
  }
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
  const addToast = (message, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  };
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

    if (currentTripId) {
      (async () => {
        try {
          const movedDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, moved.id);
          await updateDoc(movedDocRef, { position: newPos });
        } catch (err) {
          console.error('Failed to persist reordering', err);
          addToast('Could not persist reorder remotely — saved locally only', 'warning');
        }
      })();
    } else {
      addToast('Reordered items', 'success');
    }
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
          try { await batch.commit(); } catch (e) { console.error('Failed reindex batch', e); addToast('Failed to reindex item order remotely', 'warning'); }
        }
        setTripItems(sortTripItems(newNext));
        addToast('Reindexed items and moved up', 'success');
      };
      reindex();
      return;
    }

    const updated = next.map(x => x.id === id ? { ...x, position: newPos } : x);
    setTripItems(sortTripItems(updated));
    if (currentTripId) {
      (async () => {
        try {
          const itemRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, id);
          await updateDoc(itemRef, { position: newPos });
          addToast('Moved up', 'success');
        } catch (e) {
          console.error('Failed to persist move up', e);
          addToast('Could not persist move up remotely', 'warning');
        }
      })();
    } else {
      addToast('Moved up', 'success');
    }
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
    if (currentTripId) {
      (async () => {
        try {
          const itemRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, id);
          await updateDoc(itemRef, { position: newPos });
          addToast('Moved down', 'success');
        } catch (e) {
          console.error('Failed to persist move down', e);
          addToast('Could not persist move down remotely', 'warning');
        }
      })();
    } else {
      addToast('Moved down', 'success');
    }
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
    if (currentTripId) {
      (async () => {
        try {
          const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`);
          await addDoc(itineraryRef, itemToAdd);
          // onSnapshot will update local state; just reset UI
          resetLocal();
        } catch (err) {
          console.error('Failed to add itinerary item', err);
          // fall back to local
          const itemWithId = { ...itemToAdd, id: Math.random().toString(36).substr(2, 9) };
          setTripItems(prev => sortTripItems([...prev, itemWithId]));
          resetLocal();
        }
      })();
    } else {
  const itemWithId = { ...itemToAdd, id: Math.random().toString(36).substr(2, 9) };
  setTripItems(prev => sortTripItems([...prev, itemWithId]));
      resetLocal();
    }
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
    if (currentTripId && editingItem && editingItem.id) {
      (async () => {
        try {
          const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, editingItem.id);
          await updateDoc(itemDocRef, { ...newItem });
          // onSnapshot will update local state
          resetLocal();
        } catch (err) {
          console.error('Failed to update itinerary item', err);
          // fallback to local update
          setTripItems(prev => sortTripItems(prev.map(item => item.id === editingItem.id ? newItem : item)));
          resetLocal();
        }
      })();
    } else {
  setTripItems(prev => sortTripItems(prev.map(item => item.id === (editingItem && editingItem.id) ? newItem : item)));
      resetLocal();
    }
  };
  const handleDeleteItem = (id) => {
    // Optimistic local removal so UI is responsive.
    setTripItems(prev => sortTripItems(prev.filter(item => item.id !== id)));

    // If a trip is selected, attempt remote delete only for signed-in users.
    if (currentTripId) {
      if (!userId) {
        // Not signed in: inform the user that remote deletion requires sign-in.
        addToast('Sign in to persist deletions to the cloud. Item removed locally only.', 'warning');
        return;
      }
      (async () => {
        try {
          const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, id);
          await deleteDoc(itemDocRef);
          addToast('Deleted item', 'success');
          // onSnapshot will confirm remote state
        } catch (err) {
          console.error('Failed to delete itinerary item remotely', err);
          addToast('Could not delete item remotely — it may be a permissions issue', 'warning');
          // onSnapshot will refresh local state from remote; no further action here
        }
      })();
    } else {
      addToast('Deleted item (local demo)', 'success');
    }
  };

  // Omni import consumer: expects payload = [{ entry, action }]
  const handleImportResult = async (payload) => {
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

      if (currentTripId) {
        // Firestore path
        try {
          const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`);
          if (existing) {
            const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, existing.id);
            if (action === 'replace') {
              // delete existing doc then add new one
              try {
                await deleteDoc(itemDocRef);
                await addDoc(itineraryRef, incoming);
                summary.replaced += 1;
              } catch (e) {
                console.error('Replace (delete+add) failed', e);
                summary.errors += 1;
              }
            } else {
              // merge: prefer incoming values when present
              const merged = { ...existing, ...incoming };
              try {
                await updateDoc(itemDocRef, { ...merged });
                summary.updated += 1;
              } catch (e) {
                console.error('Update failed', e);
                summary.errors += 1;
              }
            }
          } else {
            // add new document
            try {
              await addDoc(itineraryRef, incoming);
              summary.created += 1;
            } catch (e) {
              console.error('Add failed', e);
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
          await addDoc(itineraryRef, incoming);
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
                await addDoc(itineraryRef, itemToAdd);
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
    const itineraryRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`);
    const unsubscribe = onSnapshot(itineraryRef, (snapshot) => {
      (async () => {
        try {
          const rawItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
          if (toSeed.length > 0 && currentTripId) {
            // Batch update positions for groups that need seeding
            const batch = writeBatch(db);
            for (const g of toSeed) {
              // Sort existing by id stable order then assign positions
              g.items.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
              for (let i = 0; i < g.items.length; i++) {
                const it = g.items[i];
                const p = (i + 1) * BASE_GAP;
                // Update local copy
                const locIdx = updatedLocal.findIndex(x => x.id === it.id);
                if (locIdx !== -1) updatedLocal[locIdx] = { ...updatedLocal[locIdx], position: p };
                // Prepare remote update
                const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, it.id);
                // eslint-disable-next-line no-console
                console.log('Seeding position for', it.id, '->', p);
                batch.set(itemDocRef, { position: p }, { merge: true });
              }
            }
            try {
              await batch.commit();
              addToast('Seeded ordering positions for trip', 'info');
            } catch (e) {
              console.error('Failed to seed positions', e);
              addToast('Could not seed ordering positions remotely', 'warning');
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

  const handleTripSelect = (trip) => {
    if (trip && trip.id) setCurrentTripId(trip.id);
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
        for (const it of items) {
          try {
            await addDoc(itineraryRef, it);
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
      <TripSelectModal isOpen={showTripSelectModal} onClose={() => setShowTripSelectModal(false)} userId={userId} onTripSelect={(trip) => { handleTripSelect(trip); setShowTripSelectModal(false); }} />
      <TripCreateModal isOpen={showTripCreateModal} onClose={() => setShowTripCreateModal(false)} userId={userId} onTripCreated={(trip) => { handleTripCreated(trip); setShowTripCreateModal(false); }} />
      {/* Summary/Header Area + Tabbed View Switcher */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-indigo-700 tracking-tight">Trip Itinerary</h2>
          <div className="flex items-center gap-3 mt-1">
            <div className="text-gray-500 text-sm">Plan, organize, and visualize your trip</div>
            {userId ? (
              <button onClick={() => setShowProfileModal(true)} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Your trips{currentTripName ? `: ${currentTripName}` : ''}</button>
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
  {activeView === 'map' && <TripMap tripItems={tripItems} />}
  {/* Discover view temporarily hidden while Unsplash account is in review */}
      </div>
      {/* Bottom Navigation for mobile */}
      <div className="md:hidden mt-4">
        <BottomNav activeView={activeView} setActiveView={setActiveView} />
      </div>
      {/* Modals (stubbed) */}
  <AIImportModal isOpen={showAIImportModal} onClose={() => setShowAIImportModal(false)} onImportSuccess={handleImportResult} onError={msg => alert(msg)} initialProfile={tripProfile} />
  <MergeRequestModal requests={mergeRequests} onResolve={handleResolveMergeRequest} onClose={() => setMergeRequests([])} />
  <TripProfileModal isOpen={showProfileModal} profile={tripProfile} tripItems={tripItems} onLoad={handleImportProfileLoad} onClose={() => setShowProfileModal(false)} onSave={(p) => {
        setTripProfile(p);
        // Persist profile to Firestore trip document when a trip is selected
        if (currentTripId) {
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
    </div>
  );
}
