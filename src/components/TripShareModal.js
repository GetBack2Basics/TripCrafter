import React, { useState } from 'react';

export default function TripShareModal({ isOpen, onClose, trip, onShare }) {
  const [principal, setPrincipal] = useState('');
  const [permission, setPermission] = useState('view');

  if (!isOpen || !trip) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={() => onClose()}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Share Trip: {trip.name || trip.id}</h2>
        <div className="mb-3">
          <label className="block text-sm text-gray-600">Recipient UID or email</label>
          <input className="w-full border px-2 py-1 rounded" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="user@example.com or UID" />
        </div>
        <div className="mb-3">
          <label className="block text-sm text-gray-600">Permission</label>
          <select className="w-full border px-2 py-1 rounded" value={permission} onChange={e => setPermission(e.target.value)}>
            <option value="view">View only</option>
            <option value="edit">Can edit</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded bg-gray-100" onClick={() => onClose()}>Cancel</button>
          <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={() => { if (!principal) { alert('Enter recipient'); return; } onShare(principal, permission); }}>Stage share</button>
        </div>
      </div>
    </div>
  );
}
