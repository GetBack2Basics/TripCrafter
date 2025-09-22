import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function TripCreateModal({ isOpen, onClose, userId, onTripCreated }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // If user is not logged in, create a local public trip object (avoid remote Firestore writes)
      if (!userId) {
        const newTripId = `public_${Date.now()}`;
        const localTrip = { id: newTripId, name, startDate, endDate, ownerId: null, public: true, createdAt: Date.now() };
        setLoading(false);
        if (onTripCreated) onTripCreated(localTrip);
        onClose();
        return;
      }

      const tripsRef = collection(db, `artifacts/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/public/data/trips`);
      const docRef = await addDoc(tripsRef, {
        name,
        startDate,
        endDate,
        ownerId: userId,
        public: false,
        createdAt: new Date(),
      });
      setLoading(false);
      if (onTripCreated) onTripCreated({ id: docRef.id, name, startDate, endDate });
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Create New Trip</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Trip Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" disabled={loading}>
            {loading ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
      </div>
    </div>
  );
}
