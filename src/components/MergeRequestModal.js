import React from 'react';

export default function MergeRequestModal({ requests, onResolve, onClose }) {
  if (!requests || requests.length === 0) return null;
  const current = requests[0];
  const { incoming, existing } = current;
  const [buffer, setBuffer] = React.useState({ ...existing });

  React.useEffect(() => {
    setBuffer({ ...existing });
  }, [existing]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-60">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-4">
        <h3 className="text-lg font-semibold mb-2">Merge requested — {incoming.date}</h3>
        <p className="text-sm text-gray-600 mb-3">An incoming {incoming.type} booking conflicts with an existing booking for the same date. Edit fields below and choose how to resolve.</p>
        <div className="grid grid-cols-1 gap-3 mb-4">
          <label className="text-sm">Title</label>
          <input className="w-full p-2 border rounded" value={buffer.title || ''} onChange={e => setBuffer(b => ({ ...b, title: e.target.value }))} />
          <label className="text-sm">Location</label>
          <input className="w-full p-2 border rounded" value={buffer.location || ''} onChange={e => setBuffer(b => ({ ...b, location: e.target.value }))} />
          <label className="text-sm">Activities</label>
          <textarea className="w-full p-2 border rounded" rows={4} value={buffer.activities || ''} onChange={e => setBuffer(b => ({ ...b, activities: e.target.value }))} />
          <label className="text-sm">Notes</label>
          <textarea className="w-full p-2 border rounded" rows={3} value={buffer.notes || ''} onChange={e => setBuffer(b => ({ ...b, notes: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => onResolve('skip', current)} className="px-3 py-2 rounded border">Skip</button>
          <button onClick={() => onResolve('merge', { ...current, merged: buffer })} className="px-3 py-2 rounded bg-indigo-600 text-white">Merge & Save</button>
          <button onClick={() => onResolve('replace', current)} className="px-3 py-2 rounded bg-red-100 text-red-700">Replace</button>
        </div>
      </div>
    </div>
  );
}
