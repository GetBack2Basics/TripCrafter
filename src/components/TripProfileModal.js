import React, { useState, useEffect } from 'react';

export default function TripProfileModal({ isOpen, profile = {}, onClose, onSave }) {
  const [adults, setAdults] = useState(profile.adults || 2);
  const [children, setChildren] = useState(profile.children || 0);
  const [interests, setInterests] = useState(profile.interests || []);
  const [diet, setDiet] = useState(profile.diet || 'everything');

  // allow adding custom options
  const [interestOptions, setInterestOptions] = useState(['hiking','biking','history','relax','bars','wildlife','beaches','wine','coastal walks','food & markets']);
  const [newInterest, setNewInterest] = useState('');
  const [dietOptions, setDietOptions] = useState(['everything','vegetarian','vegan','gluten-free','pescatarian','halal','kosher']);
  const [newDiet, setNewDiet] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAdults(profile.adults || 2);
      setChildren(profile.children || 0);
      setInterests(profile.interests || []);
      setDiet(profile.diet || 'everything');
    }
  }, [isOpen, profile]);

  const toggleInterest = (i) => {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const addInterest = () => {
    const val = (newInterest || '').trim();
    if (!val) return;
    if (!interestOptions.includes(val)) setInterestOptions(prev => [...prev, val]);
    if (!interests.includes(val)) setInterests(prev => [...prev, val]);
    setNewInterest('');
  };

  const addDiet = () => {
    const val = (newDiet || '').trim();
    if (!val) return;
    if (!dietOptions.includes(val)) setDietOptions(prev => [...prev, val]);
    setDiet(val);
    setNewDiet('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-60">
      <div className="bg-white rounded-lg shadow-lg max-w-xl w-full p-4">
        <h3 className="text-lg font-semibold mb-2">Trip profile</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-sm">Number of adults</label>
            <input type="number" value={adults} min={0} onChange={e => setAdults(Number(e.target.value))} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="text-sm">Number under 16</label>
            <input type="number" value={children} min={0} onChange={e => setChildren(Number(e.target.value))} className="w-full p-2 border rounded" />
          </div>
          <div className="col-span-2">
            <label className="text-sm">Interests</label>
            <div className="flex gap-2 flex-wrap mt-2">
              {interestOptions.map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded">
                  <input type="checkbox" checked={interests.includes(opt)} onChange={() => toggleInterest(opt)} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input placeholder="Add interest" value={newInterest} onChange={e => setNewInterest(e.target.value)} className="p-2 border rounded flex-1" />
              <button onClick={addInterest} className="px-3 py-2 bg-gray-200 rounded">Add</button>
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-sm">Food / Diet</label>
            <select value={diet} onChange={e => setDiet(e.target.value)} className="w-full p-2 border rounded mt-2">
              {dietOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="flex gap-2 mt-2">
              <input placeholder="Add diet option" value={newDiet} onChange={e => setNewDiet(e.target.value)} className="p-2 border rounded flex-1" />
              <button onClick={addDiet} className="px-3 py-2 bg-gray-200 rounded">Add</button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
          <button onClick={() => { onSave({ adults, children, interests, diet }); onClose(); }} className="px-3 py-2 rounded bg-indigo-600 text-white">Save</button>
        </div>
      </div>
    </div>
  );
}
