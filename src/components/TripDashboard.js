
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, addDoc, updateDoc, deleteDoc, onSnapshot, doc, where } from 'firebase/firestore';
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
    };
  }
  const [tripItems, setTripItems] = useState(defaultTasmaniaTripDataRaw.map(normalizeTripItem));
  const [mergeRequests, setMergeRequests] = useState([]);
  const [toasts, setToasts] = useState([]);
  const addToast = (message, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  };
  const [newItem, setNewItem] = useState({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
  const [editingItem, setEditingItem] = useState(null);

  // Demo trip editing logic (add, edit, delete)
  const handleAddItem = () => {
    // Persist the new item to Firestore if a trip is selected, otherwise keep local demo behavior
    const itemToAdd = { ...newItem };
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
          setTripItems(prev => [...prev, itemWithId]);
          resetLocal();
        }
      })();
    } else {
      const itemWithId = { ...itemToAdd, id: Math.random().toString(36).substr(2, 9) };
      setTripItems(prev => [...prev, itemWithId]);
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
          setTripItems(prev => prev.map(item => item.id === editingItem.id ? newItem : item));
          resetLocal();
        }
      })();
    } else {
      setTripItems(prev => prev.map(item => item.id === (editingItem && editingItem.id) ? newItem : item));
      resetLocal();
    }
  };
  const handleDeleteItem = (id) => {
    if (currentTripId) {
      (async () => {
        try {
          const itemDocRef = doc(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips/${currentTripId}/itineraryItems`, id);
          await deleteDoc(itemDocRef);
          // onSnapshot will update local state
        } catch (err) {
          console.error('Failed to delete itinerary item', err);
          // fallback local removal
          setTripItems(prev => prev.filter(item => item.id !== id));
        }
      })();
    } else {
      setTripItems(prev => prev.filter(item => item.id !== id));
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
        setTripItems(prev => prev.map(t => t.id === existing.id ? { ...t, _pendingMerge: true } : t));
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
            setTripItems(prev => prev.filter(t => t.id !== existing.id));
            const newItem = { ...incoming, id: incoming.id || Math.random().toString(36).substr(2, 9) };
            setTripItems(prev => [...prev, newItem]);
            summary.replaced += 1;
          } else {
            // import => merge (incoming overrides)
            setTripItems(prev => prev.map(t => t.id === existing.id ? { ...t, ...incoming } : t));
            summary.updated += 1;
          }
        } else {
          // create new local item with id
          const newItem = { ...incoming, id: incoming.id || Math.random().toString(36).substr(2, 9) };
          setTripItems(prev => [...prev, newItem]);
          summary.created += 1;
        }
      }

      // Enforce single roofed/camp per day locally: if incoming is roofed/camp, demote others
      if (incoming.type === 'roofed' || incoming.type === 'camp') {
        // Update local state immediately
        setTripItems(prev => prev.map(t => {
          if (t.id === incoming.id) return t;
          if (t.date === incoming.date && t.type === incoming.type) {
            return { ...t, status: 'Unconfirmed' };
          }
          return t;
        }));
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
      setTripItems(prev => prev.map(t => t.id === existing.id ? { ...t, _pendingMerge: false } : t));
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
      setTripItems(prev => {
        const filtered = prev.filter(t => t.id !== existing.id);
        const added = [...filtered, incoming];
        return added.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      });
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
      setTripItems(prev => prev.map(t => t.id === existing.id ? { ...merged, _pendingMerge: false } : t).sort((a, b) => (a.date || '').localeCompare(b.date || '')));
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
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTripItems(items.map(normalizeTripItem));
      const found = userTrips.find(t => t.id === currentTripId);
      setCurrentTripName(found ? found.name || null : null);
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

  return (
    <div className="flex flex-col min-h-[60vh]">
      <AppHeader
        userEmail={userEmail}
        userAvatar={userAvatar}
        activeView={activeView}
        setActiveView={setActiveView}
        onAddStop={() => setShowAddForm(true)}
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
  {activeView === 'itinerary' && <TripTable tripItems={tripItems} handleEditClick={handleEditClick} handleDeleteItem={handleDeleteItem} />}
  {activeView === 'list' && <TripList tripItems={tripItems} handleEditClick={handleEditClick} handleDeleteItem={handleDeleteItem} />}
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
  <TripProfileModal isOpen={showProfileModal} profile={tripProfile} onClose={() => setShowProfileModal(false)} onSave={(p) => {
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
