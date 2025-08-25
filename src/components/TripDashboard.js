
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, getDocs, doc, setDoc } from 'firebase/firestore';
import defaultTasmaniaTripData from '../Trip-Default_Tasmania2025';
import TripTable from '../TripTable';
import TripList from '../TripList';
import TripMap from '../TripMap';
import BottomNav from './BottomNav';
import AIImportButton from './AIImportButton';

export default function TripDashboard() {
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

  // Handlers for edit and delete actions in TripList
  const handleEditClick = (item) => {
    alert(`Edit: ${item.location}`);
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
        } else {
          try {
            await signInAnonymously(firebaseAuth);
          } catch (error) {
            setUserId('local-fallback-user');
          }
        }
        setIsAuthReady(true);
      });
      return () => unsubscribeAuth();
    } else {
      setTripItems(defaultTasmaniaTripData.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setLoading(false);
      setIsAuthReady(true);
    }
  }, []);

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
        <div className="flex gap-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow transition text-sm flex items-center">
            + Add Stop
          </button>
          <AIImportButton size="default" />
        </div>
      </div>

      {/* Discover Carousel (responsive, fixed, hideable, max 3) */}
      {showCarousel && (
        <DiscoverCarousel tripItems={tripItems.slice(0, 3)} onHide={() => setShowCarousel(false)} />
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
            List
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
            {activeView === 'itinerary' && <TripTable tripItems={tripItems} handleEditClick={handleEditClick} handleDeleteItem={handleDeleteItem} />}
            {activeView === 'list' && <TripList tripItems={tripItems} handleEditClick={handleEditClick} handleDeleteItem={handleDeleteItem} />}
            {activeView === 'map' && <TripMap tripItems={tripItems} />}
          </>
        )}
      </div>

      {/* Bottom Navigation for mobile */}
      <div className="md:hidden mt-4">
        <BottomNav activeView={activeView} setActiveView={setActiveView} />
      </div>
    </div>
  );
}

function DiscoverCarousel({ tripItems, onHide }) {
  const [images, setImages] = useState([]);
  useEffect(() => {
    let cancelled = false;
    async function fetchImages() {
      const results = await Promise.all(tripItems.map(async (item) => {
        try {
          const res = await axios.get(`/api/pexels-proxy?q=${encodeURIComponent(item.location)}`);
          return {
            url: res.data.url,
            photographer: res.data.photographer,
            photographer_url: res.data.photographer_url,
            alt: res.data.alt,
            location: item.location,
            accommodation: item.accommodation,
            activities: item.activities,
            id: item.id,
          };
        } catch (e) {
          return {
            url: '/logo512.png', // fallback to static placeholder
            photographer: null,
            photographer_url: null,
            alt: item.location,
            location: item.location,
            accommodation: item.accommodation,
            activities: item.activities,
            id: item.id,
          };
        }
      }));
      if (!cancelled) setImages(results);
    }
    fetchImages();
    return () => { cancelled = true; };
  }, [tripItems]);

  return (
    <div className="mb-4 z-30 bg-white sticky top-0" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between px-2 pt-2">
        <h3 className="text-lg font-semibold text-indigo-700 mb-2">Discover Tasmania</h3>
        <button onClick={onHide} className="text-xs text-gray-400 hover:text-indigo-600 px-2 py-1">Hide</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-2 pb-2">
        {images.map((img, idx) => (
          <div key={img.id} className="bg-white rounded-xl shadow border border-gray-100 flex flex-col">
            <a href={img.photographer_url || img.url} target="_blank" rel="noopener noreferrer">
              <img
                src={img.url}
                alt={img.alt || img.location}
                className="h-40 w-full object-cover rounded-t-xl"
                onError={e => { e.target.onerror = null; e.target.src = '/logo512.png'; }}
              />
            </a>
            <div className="p-3 flex-1 flex flex-col">
              <div className="font-bold text-indigo-700 text-sm mb-1">{img.location}</div>
              <div className="text-xs text-gray-500 flex-1">{img.accommodation || img.activities || ''}</div>
              {img.photographer && (
                <div className="text-[10px] text-gray-400 mt-1">Photo: <a href={img.photographer_url} target="_blank" rel="noopener noreferrer" className="underline">{img.photographer}</a> / Pexels</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

}
