
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, getDocs, doc, setDoc } from 'firebase/firestore';
import defaultTasmaniaTripData from '../Trip-Default_Tasmania2025';
import TripTable from '../TripTable';
import TripList from '../TripList';
import TripMap from '../TripMap';

import BottomNav from './BottomNav';
import AIImportButton from './AIImportButton';
import AIImportModal from './AIImportModal';
import TripHelpModal from './TripHelpModal';
import TripForm from '../TripForm';

export default function TripDashboard({ setUserEmail, setUserAvatar }) {
  // Modal state for conflict resolution
  const [modalOptions, setModalOptions] = useState({ show: false });
  // Show Discover carousel by default
  const [showCarousel, setShowCarousel] = useState(true);
  const [activeView, setActiveView] = useState('itinerary');
  const [tripItems, setTripItems] = useState([]);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [appIdentifier, setAppIdentifier] = useState('default-app-id');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [showAIImportModal, setShowAIImportModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pexelsError, setPexelsError] = useState(null);

  // Handlers for edit and delete actions in TripList
  const handleEditClick = (item) => {
    setEditingItem(item);
    setNewItem(item);
    setShowAddForm(true);
  };
  // Add item handler with date order and accommodation conflict check
  const handleAddItem = async (itemToAddArg) => {
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.app.github.dev') ||
      window.location.hostname.endsWith('.codespaces.dev')
    );
    if (!isLocal && (!db || !currentTripId)) {
      alert('Database not ready. Please try again later.');
      return;
    }
    // Title conflict check for 'roofed' or 'camp'
    const itemToAdd = itemToAddArg || newItem;
    if ((itemToAdd.type === 'roofed' || itemToAdd.type === 'camp') && itemToAdd.date) {
      const conflict = tripItems.find(item => item.date === itemToAdd.date && (item.type === 'roofed' || item.type === 'camp'));
      if (conflict) {
        // Show modal with merge/delete/ignore options (reuse AI import modal logic)
        setModalOptions({
          show: true,
          message: `A booking already exists for this date (${conflict.title}). What would you like to do?`,
          actions: [
            {
              label: 'Merge',
              onClick: async () => {
                if (isLocal) {
                  setTripItems(tripItems.map(item =>
                    item.id === conflict.id ? { ...item, ...itemToAdd } : item
                  ));
                } else {
                  const docRef = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`, conflict.id);
                  await setDoc(docRef, { ...conflict, ...itemToAdd });
                }
                setModalOptions({ show: false });
                setShowAddForm(false);
                setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
              }
            },
            {
              label: 'Delete Existing & Add New',
              onClick: async () => {
                if (isLocal) {
                  const itemWithId = { ...itemToAdd, id: Math.random().toString(36).substr(2, 9), order: Date.now() };
                  const updated = [...tripItems.filter(item => item.id !== conflict.id), itemWithId].sort((a, b) => new Date(a.date) - new Date(b.date));
                  setTripItems(updated);
                } else {
                  const docRef = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`, conflict.id);
                  await setDoc(docRef, {}, { merge: true });
                  const itineraryCollectionRef = collection(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`);
                  const newItemRef = doc(itineraryCollectionRef);
                  const itemWithId = { ...itemToAdd, id: newItemRef.id, order: Date.now() };
                  await setDoc(newItemRef, itemWithId);
                }
                setModalOptions({ show: false });
                setShowAddForm(false);
                setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
              }
            },
            {
              label: 'Ignore',
              onClick: () => setModalOptions({ show: false })
            }
          ]
        });
        return;
  }
    }
    if (isLocal) {
      // Add to local state only
      const itemWithId = { ...itemToAdd, id: Math.random().toString(36).substr(2, 9), order: Date.now() };
      const updatedItems = [...tripItems, itemWithId].sort((a, b) => new Date(a.date) - new Date(b.date));
      setTripItems(updatedItems);
      setShowAddForm(false);
      setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
    } else {
      try {
        const itineraryCollectionRef = collection(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`);
        const newItemRef = doc(itineraryCollectionRef);
        const itemWithId = { ...itemToAdd, id: newItemRef.id, order: Date.now() };
        await setDoc(newItemRef, itemWithId);
        setShowAddForm(false);
        setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
      } catch (error) {
        alert('Error adding trip item: ' + error.message);
      }
    }
  };
  // Reorder handler for drag-and-drop
  const handleReorder = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const updated = [...tripItems];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    // Optionally update the date to match the new position (if sorted by date)
    if (updated.length > 1 && moved.date) {
      let newDate = moved.date;
      if (toIndex > 0 && toIndex < updated.length - 1) {
        const prevDate = new Date(updated[toIndex - 1].date);
        const nextDate = new Date(updated[toIndex + 1].date);
        const avgTime = Math.round((prevDate.getTime() + nextDate.getTime()) / 2);
        newDate = new Date(avgTime).toISOString().slice(0, 10);
      } else if (toIndex === 0 && updated[1].date) {
        const nextDate = new Date(updated[1].date);
        newDate = new Date(nextDate.getTime() - 86400000).toISOString().slice(0, 10);
      } else if (toIndex === updated.length - 1 && updated[updated.length - 2].date) {
        const prevDate = new Date(updated[updated.length - 2].date);
        newDate = new Date(prevDate.getTime() + 86400000).toISOString().slice(0, 10);
      }
      updated[toIndex] = { ...moved, date: newDate };
    }
    // Update order field for all items
    const reordered = updated.map((item, idx) => ({ ...item, order: idx * 1000 }));
    setTripItems(reordered);
    // Persist the new order to Firestore if available and not local
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.app.github.dev') ||
      window.location.hostname.endsWith('.codespaces.dev')
    );
    if (!isLocal && typeof db !== 'undefined' && db && currentTripId) {
      const itineraryCollectionRef = require('firebase/firestore').collection(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`);
      reordered.forEach(async (item) => {
        const docRef = require('firebase/firestore').doc(itineraryCollectionRef, item.id);
        await require('firebase/firestore').setDoc(docRef, { order: item.order }, { merge: true });
      });
    }
  };

  // Save edit handler
  const handleSaveEdit = async (itemToSaveArg) => {
    if (!db || !currentTripId || !editingItem) {
      alert('Database not ready or no item selected.');
      return;
    }
    try {
      const docRef = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`, editingItem.id);
      await setDoc(docRef, itemToSaveArg || newItem, { merge: true });
      setShowAddForm(false);
      setEditingItem(null);
      setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
    } catch (error) {
      alert('Error saving trip item: ' + error.message);
    }
  };

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };
  const handleDeleteItem = (id) => {
    if (window.confirm('Delete this item?')) {
      setTripItems(tripItems.filter(item => item.id !== id));
    }
  };

  // Firebase initialization
  useEffect(() => {
    let firebaseConfig = {};
    let tempAppIdentifier = 'default-app-id';
    firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
    };
    tempAppIdentifier = process.env.REACT_APP_FIREBASE_PROJECT_ID || 'netlify-app-id';
    setAppIdentifier(tempAppIdentifier);
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      setDb(firestore);
      const firebaseAuth = getAuth(app);
      setAuth(firebaseAuth);
      const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          // Set user email and avatar if available
          if (setUserEmail) setUserEmail(user.email || null);
          if (setUserAvatar) setUserAvatar(user.photoURL || null);
        } else {
          try {
            await signInAnonymously(firebaseAuth);
          } catch (error) {
            setUserId('local-fallback-user');
            if (setUserEmail) setUserEmail(null);
            if (setUserAvatar) setUserAvatar(null);
          }
        }
        setIsAuthReady(true);
      });
      return () => unsubscribeAuth();
    } else {
      setTripItems(defaultTasmaniaTripData.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setLoading(false);
      setIsAuthReady(true);
      if (setUserEmail) setUserEmail(null);
      if (setUserAvatar) setUserAvatar(null);
    }
  }, [setUserEmail, setUserAvatar]);

  // Trip initialization (create default trip if none exists)
  useEffect(() => {
    if (!db || !userId || !isAuthReady || !auth || !appIdentifier) return;
    const initializeTrip = async () => {
      setLoading(true);
      const tripsCollectionRef = collection(db, `artifacts/${appIdentifier}/public/data/trips`);
      const q = query(tripsCollectionRef);
      const tripsSnapshot = await getDocs(q);
      let selectedTripId;
      if (tripsSnapshot.empty) {
        const newTripRef = doc(tripsCollectionRef);
        selectedTripId = newTripRef.id;
        await setDoc(newTripRef, {
          name: 'Tasmania 2025',
          startDate: '2025-12-22',
          endDate: '2026-01-13',
          ownerId: userId,
          createdAt: new Date(),
        });
        const itineraryCollectionRef = collection(newTripRef, 'itineraryItems');
        for (const [index, item] of defaultTasmaniaTripData.entries()) {
          await setDoc(doc(itineraryCollectionRef, item.id), {
            ...item,
            order: index * 1000
          });
        }
      } else {
        selectedTripId = tripsSnapshot.docs[0].id;
      }
      setCurrentTripId(selectedTripId);
      setLoading(false);
    };
    if (!currentTripId) {
      initializeTrip();
    }
  }, [db, userId, isAuthReady, auth, currentTripId, appIdentifier]);

  // Listen for itinerary changes
  useEffect(() => {
    if (db && currentTripId && appIdentifier) {
      const itineraryRef = collection(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`);
      const q = query(itineraryRef);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            ...data,
            order: data.order !== undefined ? data.order : new Date(data.date).getTime(),
            type: data.type || 'roofed',
            activityLink: data.activityLink || data.bookingCom || ''
          });
        });
        setTripItems(items.sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order;
          return new Date(a.date) - new Date(b.date);
        }));
      });
      return () => unsubscribe();
    }
  }, [db, currentTripId, appIdentifier]);

  return (
    <div className="flex flex-col min-h-[60vh]">
      {/* CTA Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex gap-2 justify-center w-full">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow transition text-sm flex items-center"
            onClick={() => {
              // Set default date to latest in tripItems, or today if none
              let latestDate = '';
              if (tripItems.length > 0) {
                latestDate = tripItems.reduce((max, item) => {
                  return (!max || new Date(item.date) > new Date(max)) ? item.date : max;
                }, '');
              }
              setNewItem(prev => ({
                ...prev,
                date: latestDate || new Date().toISOString().slice(0, 10)
              }));
              setShowAddForm(true);
            }}
          >
            + Add Stop
          </button>
          <AIImportButton size="default" onClick={() => setShowAIImportModal(true)} />
          <button
            className="bg-gray-200 hover:bg-gray-300 text-indigo-700 font-semibold px-4 py-2 rounded-lg shadow transition text-sm flex items-center"
            onClick={() => setShowHelp(true)}
          >
            Help
          </button>
        </div>
      </div>

      {/* Discover Carousel (responsive, fixed, hideable, max 3) */}
      {pexelsError && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-2 text-sm">{pexelsError}</div>
      )}
      {showCarousel && (
  <DiscoverCarousel tripItems={tripItems} onHide={() => setShowCarousel(false)} setPexelsError={setPexelsError} />
      )}
      {!showCarousel && (
        <div className="mb-2 flex justify-end">
          <button onClick={() => setShowCarousel(true)} className="text-xs text-gray-400 hover:text-indigo-600 px-2 py-1">Show Discover</button>
        </div>
      )}

      {/* Summary/Header Area + Tabbed View Switcher */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-indigo-700 tracking-tight">Trip Itinerary</h2>
          <div className="text-gray-500 text-sm mt-1">Plan, organize, and visualize your trip</div>
        </div>
        {/* Tabbed View Switcher */}
        <div className="flex space-x-2 bg-gray-100 rounded-lg p-1 mt-2 md:mt-0">
          <button
            className={`px-4 py-2 rounded-md font-medium transition text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${activeView === 'itinerary' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-white/80'}`}
            onClick={() => setActiveView('itinerary')}
          >
            Table
          </button>
          <button
            className={`px-4 py-2 rounded-md font-medium transition text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${activeView === 'list' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-white/80'}`}
            onClick={() => setActiveView('list')}
          >
            Cards
          </button>
          <button
            className={`px-4 py-2 rounded-md font-medium transition text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${activeView === 'map' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-white/80'}`}
            onClick={() => setActiveView('map')}
          >
            Map
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading trip data...</div>
        ) : (
          <>
            {activeView === 'itinerary' && <TripTable tripItems={tripItems} handleEditClick={handleEditClick} handleDeleteItem={handleDeleteItem} handleReorder={handleReorder} />}
            {activeView === 'list' && <TripList tripItems={tripItems} handleEditClick={handleEditClick} handleDeleteItem={handleDeleteItem} handleReorder={handleReorder} />}
            {activeView === 'map' && <TripMap tripItems={tripItems} />}
          </>
        )}
      </div>

      {/* Bottom Navigation for mobile */}
      <div className="md:hidden mt-4">
        <BottomNav activeView={activeView} setActiveView={setActiveView} />
      </div>

      {/* Modals */}
      <AIImportModal
        isOpen={showAIImportModal}
        onClose={() => setShowAIImportModal(false)}
        onImportSuccess={() => setShowAIImportModal(false)}
        onError={msg => alert(msg)}
      />
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
              handleInputChange={handleInputChange}
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

// Get up to 3 images for a location from /discover-images/
function getLocalDiscoverImages(location) {
  if (!location) return ['/logo512.png'];
  const base = location.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  // Try numbered variants, fallback to base
  const images = [];
  for (let i = 1; i <= 3; i++) {
    images.push(`/discover-images/${base}_${i}.jpg`);
  }
  images.push(`/discover-images/${base}.jpg`); // fallback
  return images;
}



function DiscoverCarousel({ tripItems, onHide }) {
  // Responsive: show 1 on mobile, 2 on sm, 3 on md+
  const [visibleStart, setVisibleStart] = useState(0);
  const [visibleCount, setVisibleCount] = useState(typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : (window.innerWidth < 768 ? 2 : 3));
  const [imageIndexes, setImageIndexes] = useState([0]);
  const intervalRef = useRef();
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setVisibleCount(1);
      else if (window.innerWidth < 768) setVisibleCount(2);
      else setVisibleCount(3);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const visibleLocations = tripItems.slice(visibleStart, visibleStart + visibleCount);
  const locationImages = visibleLocations.map(item => getLocalDiscoverImages(item.location));
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setImageIndexes(prev => prev.map((idx, i) => {
        const imgs = locationImages[i] || [];
        if (imgs.length === 0) return 0;
        return (idx + 1) % imgs.length;
      }));
    }, 10000);
    return () => clearInterval(intervalRef.current);
  }, [locationImages, visibleStart]);
  useEffect(() => {
    setImageIndexes(Array(visibleCount).fill(0));
  }, [visibleStart, visibleCount]);
  const canScrollLeft = visibleStart > 0;
  const canScrollRight = visibleStart + visibleCount < tripItems.length;

  return (
    <div className="mb-4 z-30 bg-white sticky top-0" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between px-2 pt-2">
        <h3 className="text-lg font-semibold text-indigo-700 mb-2">Discover Tasmania</h3>
        <button onClick={onHide} className="text-xs text-gray-400 hover:text-indigo-600 px-2 py-1">Hide</button>
      </div>
      <div className="flex justify-between items-center px-2 pb-2">
        <button
          onClick={() => setVisibleStart(s => Math.max(0, s - 1))}
          disabled={!canScrollLeft}
          className={`text-lg px-2 py-1 rounded ${canScrollLeft ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'}`}
        >&#8592;</button>
        <div className={`grid grid-cols-1 ${visibleCount > 1 ? 'sm:grid-cols-2' : ''} ${visibleCount > 2 ? 'md:grid-cols-3' : ''} gap-4 flex-1`}>
          {visibleLocations.map((item, i) => {
            const imgs = locationImages[i] || [];
            const imgUrl = imgs[imageIndexes[i]] || '/logo512.png';
            return (
              <div key={item.id} className="bg-white rounded-xl shadow border border-gray-100 flex flex-col">
                <img
                  src={imgUrl}
                  alt={item.location}
                  className="h-40 w-full object-cover rounded-t-xl"
                  onError={e => { e.target.onerror = null; e.target.src = '/logo512.png'; }}
                />
                <div className="p-3 flex-1 flex flex-col">
                  <div className="font-bold text-indigo-700 text-sm mb-1">{item.location}</div>
                  <div className="text-xs text-gray-500 flex-1">{item.title || item.activities || ''}</div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setVisibleStart(s => Math.min(tripItems.length - visibleCount, s + 1))}
          disabled={!canScrollRight}
          className={`text-lg px-2 py-1 rounded ${canScrollRight ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'}`}
        >&#8594;</button>
      </div>
    </div>
  );
}
