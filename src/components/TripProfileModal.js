import React, { useState, useEffect, useRef } from 'react';

export default function TripProfileModal({ isOpen, profile = {}, tripItems = [], onClose, onSave, onLoad }) {
  const [adults, setAdults] = useState(profile.adults || 2);
  const [children, setChildren] = useState(profile.children || 0);
  const [interests, setInterests] = useState(profile.interests || []);
  const [diet, setDiet] = useState(profile.diet || 'everything');

  // allow adding custom options
  const [interestOptions, setInterestOptions] = useState(['hiking','biking','history','relax','bars','wildlife','beaches','wine','coastal walks','food & markets']);
  const [newInterest, setNewInterest] = useState('');
  const [dietOptions, setDietOptions] = useState(['everything','vegetarian','vegan','gluten-free','pescatarian','halal','kosher']);
  const [newDiet, setNewDiet] = useState('');
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedImportFileName, setSelectedImportFileName] = useState(null);

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
  const handleFileImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        // Basic validation
        if (!data || typeof data !== 'object') throw new Error('Invalid JSON');
        if (!data.profile) data.profile = { adults: 2, children: 0, interests: [], diet: 'everything' };
        if (!data.items) data.items = [];
        if (onLoad) onLoad(data);
        onClose();
      } catch (e) {
        setImportError(e.message || 'Failed to parse JSON');
      }
    };
    reader.readAsText(file);
  };

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
        <div className="flex justify-between items-center gap-2">
          <div>
            <button onClick={async () => {
              const exportObj = {
                profile: { adults, children, interests, diet },
                items: tripItems || []
              };
              const contents = JSON.stringify(exportObj, null, 2);
              const suggestedName = `trip-export-${Date.now()}.json`;
              // Try File System Access API
              if (window.showSaveFilePicker) {
                try {
                  const opts = { suggestedName, types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] };
                  const handle = await window.showSaveFilePicker(opts);
                  const writable = await handle.createWritable();
                  await writable.write(contents);
                  await writable.close();
                  return;
                } catch (e) {
                  // fall back to download
                }
              }
              // Fallback: ask for a filename via prompt then download
              let filename = window.prompt('Save file as', suggestedName) || suggestedName;
              const blob = new Blob([contents], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }} className="px-3 py-2 rounded border bg-white text-sm">Export JSON</button>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} id="trip-import-file" type="file" accept=".json,application/json" onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) {
                  setSelectedImportFileName(f.name);
                  handleFileImport(f);
                }
              }} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current && fileInputRef.current.click()} className="px-3 py-2 border rounded bg-white">Import</button>
              <div className="text-xs text-gray-500">{selectedImportFileName || 'No file chosen'}</div>
            </div>
            {importError && <div className="text-xs text-red-500">{importError}</div>}
            <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
            <button onClick={() => { onSave({ adults, children, interests, diet }); onClose(); }} className="px-3 py-2 rounded bg-indigo-600 text-white">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
