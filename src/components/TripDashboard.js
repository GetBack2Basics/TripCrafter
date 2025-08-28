
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

  function normalizeTripItem(item) {
    // Ensure all required fields exist and are named consistently
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
      activityLink: item.activityLink || '',
      discoverImages: discoverImagesForLocation(item.location),
    };
  }
  const [tripItems, setTripItems] = useState(defaultTasmaniaTripDataRaw.map(normalizeTripItem));
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
              <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Your trips{currentTripName ? `: ${currentTripName}` : ''}</div>
            ) : (
              <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Demo trip</div>
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
      <AIImportModal isOpen={showAIImportModal} onClose={() => setShowAIImportModal(false)} onImportSuccess={() => setShowAIImportModal(false)} onError={msg => alert(msg)} />
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
