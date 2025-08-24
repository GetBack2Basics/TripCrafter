import React, { useState, useEffect } from 'react';
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
  const [activeView, setActiveView] = useState('itinerary');
  const [tripItems, setTripItems] = useState([]);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [appIdentifier, setAppIdentifier] = useState('default-app-id');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Figma-style tabbed view switcher and summary
  // Discover carousel sample data
  const discoverStops = [
    { id: 1, name: 'Cradle Mountain', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80', desc: 'Iconic hiking & views' },
    { id: 2, name: 'Wineglass Bay', img: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80', desc: 'Famous beach & lookout' },
    { id: 3, name: 'MONA', img: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80', desc: 'Modern art museum' },
    { id: 4, name: 'Port Arthur', img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80', desc: 'Historic site' },
    { id: 5, name: 'Bay of Fires', img: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80', desc: 'Stunning coastline' },
  ];

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

      {/* Discover Carousel */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-indigo-700 mb-2">Discover Tasmania</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
          {discoverStops.map(stop => (
            <div key={stop.id} className="min-w-[180px] bg-white rounded-xl shadow border border-gray-100 flex-shrink-0">
              <img src={stop.img} alt={stop.name} className="h-28 w-full object-cover rounded-t-xl" />
              <div className="p-3">
                <div className="font-bold text-indigo-700 text-sm mb-1">{stop.name}</div>
                <div className="text-xs text-gray-500">{stop.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
            {activeView === 'itinerary' && <TripTable tripItems={tripItems} />}
            {activeView === 'list' && <TripList tripItems={tripItems} />}
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
