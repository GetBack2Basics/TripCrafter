import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';

export default function TripSelectModal({ isOpen, onClose, userId, onTripSelect }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);
    const fetchTrips = async () => {
      const tripsRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips`);
      const q = query(tripsRef);
      const snapshot = await getDocs(q);
      const tripList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrips(tripList);
      setLoading(false);
    };
    fetchTrips();
  }, [isOpen, userId]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Select a Trip</h2>
        {loading ? (
          <div className="text-gray-500">Loading trips...</div>
        ) : trips.length === 0 ? (
          <div className="text-gray-500">No trips found.</div>
        ) : (
          <ul className="divide-y">
            {trips.map(trip => (
              <li key={trip.id} className="py-2 flex justify-between items-center">
                <span>{trip.name || trip.id}</span>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm" onClick={() => { onTripSelect(trip); onClose(); }}>Select</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
