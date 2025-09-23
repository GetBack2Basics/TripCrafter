import React, { useState, useEffect, useRef } from 'react';
import { aiImportService } from '../services/aiImportService';
import AIImportReview from './AIImportReview';
import TripCraftForm from './TripCraftForm';

function AIImportModal({ isOpen, onClose, onImportSuccess, onError, initialProfile = {} }) {
  const [reviewData, setReviewData] = useState(null);
  const [importType, setImportType] = useState('url');
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [llmPrompt, setLlmPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [manualJson, setManualJson] = useState('');
  const [showCreateTripForm, setShowCreateTripForm] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripPublic, setNewTripPublic] = useState(false);
  const newTripNameRef = useRef(null);

  useEffect(() => {
    if (showCreateTripForm && newTripNameRef.current) {
      try {
        newTripNameRef.current.focus();
        newTripNameRef.current.select();
      } catch (e) {
        // ignore
      }
    }
  }, [showCreateTripForm]);

  // helper to copy text reliably and show toast
  const copyToClipboard = async (text) => {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      addToast('Copied to clipboard', 'success');
    } catch (e) {
      addToast('Copy failed, please select and copy manually', 'warning');
    }
  };

  // The importer uses the trip profile provided by `initialProfile` (from TripProfileModal)
  // Build a canonical profile object when needed below instead of using local inputs.

  // Accept AI suggestion for a field: strip markers and mark entry as edited
  function handleAcceptSuggestion(entry, field) {
    setReviewData((prev) => {
      return prev.map((e) => {
        if (e._id === entry._id) {
          const val = e[field];
          if (typeof val === 'string') {
            const m = val.match(/^\[AI suggestion\](.*)\[\/AI suggestion\]$/s);
            if (m) {
              const cleaned = m[1].trim();
              const updated = { ...e, [field]: cleaned, _status: 'edited' };
              addToast('Accepted AI suggestion', 'success');
              return updated;
            }
          }
        }
        return e;
      });
    });
  }
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isProcessing) return;
    
    let source = null;
    
    if (importType === 'url') {
      if (!inputValue.trim()) {
        onError('Please enter a URL');
        return;
      }
      source = inputValue.trim();
    } else if (importType === 'document') {
      if (!selectedFile) {
        onError('Please select a document file');
        return;
      }
      source = selectedFile;
    } else if (importType === 'text') {
      if (!inputValue.trim()) {
        onError('Please enter some text');
        return;
      }
      source = inputValue.trim();
    }

    setIsProcessing(true);

    try {
      const profile = {
        adults: Number(initialProfile.adults) || 2,
        children: Number(initialProfile.children) || 0,
        interests: Array.isArray(initialProfile.interests) ? initialProfile.interests : [],
        diet: initialProfile.diet || 'everything',
        state: initialProfile.state,
        country: initialProfile.country
      };
      const result = await aiImportService.importFromSource(source, importType, profile);
      if (result.success) {
          // attach a status and stable id to each entry and convert AI activity suggestions into usable text
          const now = Date.now();
          const withStatus = result.data.map((d, idx) => {
            const id = d.id || `ai-import-${now}-${idx}`;
            let activities = d.activities || '';
            if (typeof activities === 'string') {
              const m = activities.match(/^\[AI suggestion\](?:Suggest activities in [^:]*:\s*)?(.*)\[\/AI suggestion\]$/s);
              if (m) activities = m[1].trim();
            }
            const notes = d.notes == null ? '' : d.notes;
            return { ...d, id, activities, notes, _status: 'pending' };
          });
          setReviewData(withStatus);
      } else {
        // On error or missing key, show the generated prompt for manual LLM use
        // For craft type, also show the table text if available
        let prompt = result.prompt || '';
        if (!prompt) {
          try {
            const profile = {
              adults: Number(initialProfile.adults) || 2,
              children: Number(initialProfile.children) || 0,
              interests: Array.isArray(initialProfile.interests) ? initialProfile.interests : [],
              diet: initialProfile.diet || 'everything',
              state: initialProfile.state,
              country: initialProfile.country
            };
            prompt = await aiImportService.getPrompt(source, importType, profile);
          } catch (e) {
            prompt = 'No prompt available. Please check your API key or try manual import.';
          }
        }
        setLlmPrompt(prompt);
        // For craft responses, also set the table text
        if (result.tableText) {
          setLlmPrompt(prev => prev + '\n\n' + result.tableText);
        }
        setShowPrompt(true);
        onError(result.error || 'AI import failed. Use manual JSON import below.');
        // Do NOT close the modal, let user see the JSON page immediately
      }
    } catch (error) {
      // If error is due to missing key or network, show manual JSON fallback
      let prompt = '';
      try {
        const profile = {
          adults: Number(initialProfile.adults) || 2,
          children: Number(initialProfile.children) || 0,
          interests: Array.isArray(initialProfile.interests) ? initialProfile.interests : [],
          diet: initialProfile.diet || 'everything',
          state: initialProfile.state,
          country: initialProfile.country
        };
        prompt = await aiImportService.getPrompt(source, importType, profile);
      } catch (e) {
        prompt = 'No prompt available. Please check your API key or try manual import.';
      }
      setLlmPrompt(prompt);
      setShowPrompt(true);
      onError(error.message || 'AI import failed. Use manual JSON import below.');
      // Do NOT close the modal, let user see the JSON page immediately
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualJsonSubmit = (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(manualJson);
      const now = Date.now();
      const cleaned = parsed.map((d, idx) => {
        const id = d.id || `ai-import-manual-${now}-${idx}`;
        let activities = d.activities || '';
        if (typeof activities === 'string') {
          const m = activities.match(/^\[AI suggestion\](?:Suggest activities in [^:]*:\s*)?(.*)\[\/AI suggestion\]$/s);
          if (m) activities = m[1].trim();
        }
        const notes = d.notes == null ? '' : d.notes;
        return { ...d, id, activities, notes, _status: 'pending' };
      });
      setReviewData(cleaned);
    } catch (err) {
      onError('Invalid JSON. Please check your LLM output.');
    }
  };

  // Review/merge handlers
  // Work by entry id (or fallback to index) to avoid index mismatches
  

  const [mergeTarget, setMergeTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  // Local flags while editing an entry to accept AI suggestions via checkbox
  const [editAcceptActivities, setEditAcceptActivities] = useState(false);
  const [editAcceptNotes, setEditAcceptNotes] = useState(false);

  useEffect(() => {
    if (!editTarget) {
      setEditAcceptActivities(false);
      setEditAcceptNotes(false);
      return;
    }
    const isActivitiesSuggested = typeof editTarget.activities === 'string' && /^\[AI suggestion\].*\[\/AI suggestion\]$/s.test(editTarget.activities);
    const isNotesSuggested = typeof editTarget.notes === 'string' && /^\[AI suggestion\].*\[\/AI suggestion\]$/s.test(editTarget.notes);
    setEditAcceptActivities(isActivitiesSuggested);
    setEditAcceptNotes(isNotesSuggested);
  }, [editTarget]);

  // Simple toast notifications
  const [toasts, setToasts] = useState([]);
  const addToast = (message, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  // Undo stack for last suggestion accept/edit action
  const [undoStack, setUndoStack] = useState([]);

  const pushUndo = (prevState) => {
    setUndoStack(s => [...s, prevState]);
    // keep stack small
    setUndoStack(s => s.slice(-10));
  };

  const handleUndoLast = () => {
    setUndoStack(s => {
      if (!s || s.length === 0) {
        addToast('Nothing to undo', 'muted');
        return s || [];
      }
      const last = s[s.length - 1];
      setReviewData(last);
      addToast('Reverted last change', 'muted');
      return s.slice(0, -1);
    });
  };

  const handleMerge = (entry) => {
    // If there's an existing approved entry with same date/type, open merge UI
    const conflict = reviewData && reviewData.find(e => e.id !== entry.id && e.date === entry.date && e.type === entry.type && e._status === 'approved');
    if (conflict) {
      setMergeTarget({ incoming: entry, existing: conflict });
      return;
    }
    enforceSinglePerDay(entry);
  pushUndo(reviewData);
  setEntryStatusById(entry, 'approved');
    addToast('Entry marked for import', 'success');
  };
  const handleIgnore = (entry) => {
  pushUndo(reviewData);
  setEntryStatusById(entry, 'ignored');
    addToast('Entry ignored', 'muted');
  };
  const handleReplace = (entry) => {
  pushUndo(reviewData);
  setEntryStatusById(entry, 'replaced');
    addToast('Entry marked to replace existing', 'warning');
  };
  const handleEdit = (entry) => {
    // Open edit modal for this entry
  pushUndo(reviewData);
  setEditTarget(entry);
  };
  const handleCancelReview = () => {
    // go back to the import form without discarding reviewData so user can re-open later if needed
    setReviewData(null);
  };

  const handleImportSelected = () => {
    if (!reviewData) return;
    // select entries marked as approved/edited/replaced for import
    const selected = reviewData.filter(e => ['approved', 'edited', 'replaced'].includes(e._status));
    if (selected.length === 0) {
      onError('No entries selected for import. Mark items with the green check to select them.');
      return;
    }
    // Map statuses to explicit import actions so the caller (omni) can handle replace vs import
      const profile = {
        adults: Number(initialProfile.adults) || 2,
        children: Number(initialProfile.children) || 0,
        interests: Array.isArray(initialProfile.interests) ? initialProfile.interests : [],
        diet: initialProfile.diet || 'everything',
        state: initialProfile.state,
        country: initialProfile.country
      };
    const payload = selected.map(e => {
      const action = e._status === 'replaced' ? 'replace' : 'import';
      const entry = { ...e, title: e.title || e.accommodation || e.name || '', profile };
      return { entry, action };
    });
    onImportSuccess(payload);
    setReviewData(null);
    handleClose();
  };

  const handleClose = () => {
    setInputValue('');
    setSelectedFile(null);
    setImportType('url');
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const handleTestSample = async (sampleKey) => {
    setIsProcessing(true);
    try {
      const result = await aiImportService.testWithSample(sampleKey);
      
      if (result.success) {
  const profile = {
    adults: Number(initialProfile.adults) || 2,
    children: Number(initialProfile.children) || 0,
    interests: Array.isArray(initialProfile.interests) ? initialProfile.interests : [],
    diet: initialProfile.diet || 'everything',
    state: initialProfile.state,
    country: initialProfile.country
  };
  const payload = result.data.map(d => ({ entry: { ...d, profile }, action: 'import' }));
  onImportSuccess(payload);
  handleClose();
      } else {
        onError(result.error);
      }
    } catch (error) {
      onError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;
  if (reviewData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
          <AIImportReview
            importedData={reviewData}
            onMerge={handleMerge}
            onIgnore={handleIgnore}
            onReplace={handleReplace}
            onEdit={handleEdit}
            onCancel={handleCancelReview}
            onAcceptAllSuggestions={() => {
              // Accept all AI suggestions across reviewData
              pushUndo(reviewData);
              setReviewData(prev => prev.map(e => {
                const out = { ...e };
                if (typeof out.activities === 'string') {
                  const m = out.activities.match(/^\[AI suggestion\](.*)\[\/AI suggestion\]$/s);
                  if (m) out.activities = m[1].trim();
                }
                if (typeof out.notes === 'string') {
                  const m2 = out.notes.match(/^\[AI suggestion\](.*)\[\/AI suggestion\]$/s);
                  if (m2) out.notes = m2[1].trim();
                }
                out._status = out._status === 'pending' ? 'edited' : out._status;
                return out;
              }));
              addToast('Accepted all AI suggestions', 'success');
            }}
            onUndoLast={handleUndoLast}
          />
          {/* Merge modal with per-field selection */}
          {mergeTarget && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-60">
              <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-4">
                <h3 className="text-lg font-semibold mb-2">Merge entries — {mergeTarget.incoming.date}</h3>
                <p className="text-sm text-gray-600 mb-3">Select which fields to keep for the merged entry. Click a field to toggle which value will be used.</p>
                <div className="grid grid-cols-1 gap-3 mb-3">
                  {['title','location','type','travelTime','activities','notes'].map(field => (
                    <div key={field} className="p-2 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm">{field}</div>
                        <div className="text-xs text-gray-500">Click to choose</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setMergeTarget(mt => ({ ...mt, chosen: { ...(mt.chosen||{}), [field]: 'incoming' } }))} className={`p-2 border rounded ${mergeTarget.chosen?.[field] === 'incoming' ? 'bg-indigo-100' : ''}`}>
                          <div className="font-sm font-medium">Incoming</div>
                          <div className="text-xs text-gray-700 mt-1">{mergeTarget.incoming[field] || '—'}</div>
                        </button>
                        <button onClick={() => setMergeTarget(mt => ({ ...mt, chosen: { ...(mt.chosen||{}), [field]: 'existing' } }))} className={`p-2 border rounded ${mergeTarget.chosen?.[field] === 'existing' ? 'bg-indigo-100' : ''}`}>
                          <div className="font-sm font-medium">Existing</div>
                          <div className="text-xs text-gray-700 mt-1">{mergeTarget.existing[field] || '—'}</div>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setMergeTarget(null)} className="px-3 py-2 rounded border">Cancel</button>
                  <button onClick={() => {
                    // build merged object based on chosen fields
                    const chosen = mergeTarget.chosen || {};
                    const fields = ['title','location','type','travelTime','activities','notes'];
                    const merged = { ...mergeTarget.existing };
                    fields.forEach(f => {
                      merged[f] = chosen[f] === 'incoming' ? mergeTarget.incoming[f] : mergeTarget.existing[f];
                    });
                    // replace existing with merged and mark approved
                    setReviewData(prev => prev.map(e => e.id === mergeTarget.existing.id ? { ...merged, _status: 'approved' } : e));
                    addToast('Merged entry approved', 'success');
                    setMergeTarget(null);
                  }} className="px-3 py-2 rounded bg-indigo-600 text-white">Merge & Approve</button>
                  <button onClick={() => {
                    // mark incoming as replaced (import and replace existing)
                    setReviewData(prev => prev.map(e => e.id === mergeTarget.incoming.id ? { ...e, _status: 'replaced' } : e));
                    addToast('Incoming entry marked to replace existing', 'warning');
                    setMergeTarget(null);
                  }} className="px-3 py-2 rounded bg-red-100 text-red-700">Replace</button>
                </div>
              </div>
            </div>
          )}

          {/* Edit modal for full entry editing */}
          {editTarget && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-60">
              <div className="bg-white rounded-lg shadow-lg max-w-xl w-full p-4">
                <h3 className="text-lg font-semibold mb-2">Edit entry — {editTarget.date}</h3>
                <div className="grid grid-cols-1 gap-3 mb-3">
                  <label className="text-sm">Title</label>
                  <input className="w-full p-2 border rounded" value={editTarget.title||''} onChange={(e) => setEditTarget(t => ({ ...t, title: e.target.value }))} />
                  <label className="text-sm">Location</label>
                  <input className="w-full p-2 border rounded" value={editTarget.location||''} onChange={(e) => setEditTarget(t => ({ ...t, location: e.target.value }))} />
                  <label className="text-sm">Type</label>
                  <select className="w-full p-2 border rounded" value={editTarget.type||'roofed'} onChange={(e) => setEditTarget(t => ({ ...t, type: e.target.value }))}>
                    <option value="roofed">roofed</option>
                    <option value="camp">camp</option>
                    <option value="enroute">enroute</option>
                  </select>
                  <label className="text-sm">Travel Time</label>
                  <input className="w-full p-2 border rounded" value={editTarget.travelTime||''} onChange={(e) => setEditTarget(t => ({ ...t, travelTime: e.target.value }))} />
                  <label className="text-sm">Activities</label>
                  <div className="flex items-center gap-3">
                    <input className="w-full p-2 border rounded" value={editTarget.activities||''} onChange={(e) => setEditTarget(t => ({ ...t, activities: e.target.value }))} />
                    {typeof editTarget.activities === 'string' && editTarget.activities.match(/^\[AI suggestion\](.*)\[\/AI suggestion\]$/s) && (
                      <label className="flex items-center text-sm gap-1">
                        <input type="checkbox" checked={editAcceptActivities} onChange={(ev) => {
                          const checked = ev.target.checked;
                          setEditAcceptActivities(checked);
                          if (checked) {
                            const m = editTarget.activities.match(/^\[AI suggestion\](.*)\[\/AI suggestion\]$/s);
                            const cleaned = m ? m[1].trim() : editTarget.activities;
                            setEditTarget(t => ({ ...t, activities: cleaned, _status: 'edited' }));
                            addToast('Accepted AI suggestion for activities', 'success');
                          }
                        }} />
                        Accept suggestion
                      </label>
                    )}
                  </div>
                  <label className="text-sm">Notes</label>
                  <div className="flex items-start gap-3">
                    <textarea className="w-full p-2 border rounded" rows={4} value={editTarget.notes||''} onChange={(e) => setEditTarget(t => ({ ...t, notes: e.target.value }))} />
                    {typeof editTarget.notes === 'string' && editTarget.notes.match(/^\[AI suggestion\](.*)\[\/AI suggestion\]$/s) && (
                      <label className="flex items-center text-sm gap-1 mt-1">
                        <input type="checkbox" checked={editAcceptNotes} onChange={(ev) => {
                          const checked = ev.target.checked;
                          setEditAcceptNotes(checked);
                          if (checked) {
                            const m = editTarget.notes.match(/^\[AI suggestion\](.*)\[\/AI suggestion\]$/s);
                            const cleaned = m ? m[1].trim() : editTarget.notes;
                            setEditTarget(t => ({ ...t, notes: cleaned, _status: 'edited' }));
                            addToast('Accepted AI suggestion for notes', 'success');
                          }
                        }} />
                        Accept suggestion
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditTarget(null)} className="px-3 py-2 rounded border">Cancel</button>
                  <button onClick={() => {
                    // Accept all AI suggestions in this edit buffer
                    setEditTarget(t => {
                      if (!t) return t;
                      const out = { ...t };
                      if (typeof out.activities === 'string') {
                        const m = out.activities.match(/^\[AI suggestion\](.*)\[\/AI suggestion\]$/s);
                        if (m) out.activities = m[1].trim();
                      }
                      if (typeof out.notes === 'string') {
                        const m2 = out.notes.match(/^\[AI suggestion\](.*)\[\/AI suggestion\]$/s);
                        if (m2) out.notes = m2[1].trim();
                      }
                      out._status = 'edited';
                      addToast('Accepted all AI suggestions for this entry', 'success');
                      return out;
                    });
                  }} className="px-3 py-2 rounded bg-green-100 text-green-700">Accept all suggestions</button>
                  <button onClick={() => {
                    // persist edits back into reviewData and mark as edited
                    setReviewData(prev => prev.map(e => e.id === editTarget.id ? { ...editTarget, _status: 'edited' } : e));
                    setEditTarget(null);
                    addToast('Entry edited', 'success');
                  }} className="px-3 py-2 rounded bg-indigo-600 text-white">Save</button>
                </div>
              </div>
            </div>
          )}

          {/* Toasts */}
          <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-70">
            {toasts.map(t => (
              <div key={t.id} className={`px-3 py-2 rounded shadow ${t.kind === 'success' ? 'bg-green-100 text-green-800' : t.kind === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                {t.message}
              </div>
            ))}
          </div>
          <div className="p-4 border-t bg-gray-50 flex justify-between">
            <div>
              <button onClick={handleCancelReview} className="px-4 py-2 rounded bg-white border border-gray-300">Back</button>
            </div>
              <div className="flex gap-2 items-start">
                <button onClick={() => { setReviewData(null); handleClose(); }} className="px-4 py-2 rounded bg-red-100 text-red-700">Discard</button>
                {!showCreateTripForm ? (
                  <button
                    disabled={!reviewData || reviewData.filter(e => ['approved', 'edited', 'replaced'].includes(e._status)).length === 0}
                    onClick={() => {
                      const selected = reviewData.filter(e => ['approved', 'edited', 'replaced'].includes(e._status));
                      if (!selected || selected.length === 0) return;
                      // initialize inline form fields with sensible defaults
                      setNewTripName(`AI Trip ${new Date().toISOString().slice(0,10)}`);
                      setNewTripPublic(false);
                      setShowCreateTripForm(true);
                      // focus will be handled by effect
                    }}
                    className={`px-4 py-2 rounded ${!reviewData || reviewData.filter(e => ['approved', 'edited', 'replaced'].includes(e._status)).length === 0 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 text-white'}`}
                  >
                    Create New Trip
                  </button>
                ) : (
                  <div className="p-3 bg-white border rounded shadow-sm">
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700">Trip name</label>
                      <input ref={newTripNameRef} autoFocus className="w-full p-2 border rounded mt-1" value={newTripName} onChange={e => setNewTripName(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <label className="flex items-center text-sm gap-2">
                        <input type="checkbox" checked={newTripPublic} onChange={e => setNewTripPublic(e.target.checked)} />
                        <span className="text-sm">Make this trip public</span>
                      </label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setShowCreateTripForm(false); }} className="px-3 py-1 border rounded">Cancel</button>
                      <button onClick={() => {
                        const selected = reviewData.filter(e => ['approved', 'edited', 'replaced'].includes(e._status));
                        if (!selected || selected.length === 0) return;
                        if (!newTripName || !newTripName.trim()) {
                          addToast('Please enter a name for the new trip', 'warning');
                          return;
                        }
                        const items = selected.map(e => ({ entry: e, action: e._status === 'replaced' ? 'replace' : 'import' }));
                        onImportSuccess({ createNewTrip: true, name: newTripName.trim(), isPublic: newTripPublic, items });
                        setReviewData(null);
                        setShowCreateTripForm(false);
                        handleClose();
                      }} className="px-3 py-1 rounded bg-emerald-600 text-white">Create</button>
                    </div>
                  </div>
                )}
              <button disabled={!reviewData || reviewData.filter(e => ['approved', 'edited', 'replaced'].includes(e._status)).length === 0} onClick={handleImportSelected} className={`px-4 py-2 rounded ${!reviewData || reviewData.filter(e => ['approved', 'edited', 'replaced'].includes(e._status)).length === 0 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 text-white'}`}>Import Selected</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-indigo-600">
              🤖 AI Import
            </h2>
          </div>

          <p className="text-gray-600 mb-6">
            Import trip data from booking confirmations, itineraries, or travel websites using AI parsing.
          </p>

          {/* Show prompt for manual LLM use if needed */}
          {showPrompt && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded">
              {/* copy helper: button uses component-scoped copyToClipboard */}
              {importType === 'craft' ? (
                <div>
                  <div className="font-semibold mb-2 text-yellow-800">Generate AI based itinerary</div>
                  <div className="text-sm text-yellow-700 mb-4">
                    <div className="font-medium mb-2">Create Your Custom Itinerary in Two Simple Steps!</div>
                    <p className="mb-3">We help you use an AI assistant to build your perfect travel plan. Follow these steps to get started:</p>

                    <h4 className="font-semibold">Step 1: Get Your Itinerary Preview</h4>
                    <ol className="list-decimal list-inside ml-4 mb-3">
                      <li><strong>Copy the Prompt:</strong> Copy the entire prompt from the box below.</li>
                      <li><strong>Paste into Your AI:</strong> Go to your preferred AI assistant (like Gemini, ChatGPT, or Grok) and paste the prompt.</li>
                      <li><strong>Review &amp; Refine:</strong> The AI will generate a detailed itinerary. Read through the table and make any adjustments needed. You can refine the plan by telling the AI things like:</li>
                    </ol>
                    <div className="bg-white p-3 border rounded mb-3 text-xs text-gray-800">
                      <div className="mb-2">"I like the pace, but can you change the date of the Disneyland trip to December 10th?"</div>
                      <div className="mb-2">"Remove the river cruise and add a visit to the Panthéon."</div>
                      <div className="mb-2">"Can we start the trip in the Montmartre area instead?"</div>
                    </div>

                    <h4 className="font-semibold">Step 2: Generate JSON for the App</h4>
                    <ol className="list-decimal list-inside ml-4 mb-3">
                      <li><strong>Request JSON:</strong> Once your itinerary is close to what you want, simply say to the AI: "Give me the TripCrafter JSON."</li>
                      <li><strong>Copy the JSON Code:</strong> The AI will provide the itinerary in a block of code. Copy only the code, starting with <code>[</code> and ending with <code>]</code>.</li>
                      <li><strong>Complete the Process:</strong> Paste the copied code into the box below and click <strong>Create Itinerary</strong>.</li>
                    </ol>
                  </div>
                  <div className="bg-white p-3 border rounded mb-4 max-h-96 overflow-y-auto">
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => {
                          copyToClipboard(llmPrompt).then(() => addToast('LLM instructions copied to clipboard', 'success'));
                        }}
                        className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50"
                      >
                        Copy instructions
                      </button>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap">{llmPrompt}</pre>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold mb-2 text-yellow-800">AI Import failed. You can copy the prompt below and paste it into Gemini, ChatGPT, or another LLM. Then paste the JSON result below to import manually.</div>
                  <div className="flex items-start gap-2 mb-2">
                    <textarea
                      className="flex-1 p-2 border border-gray-300 rounded bg-gray-50 text-xs"
                      value={llmPrompt}
                      readOnly
                      rows={8}
                      onFocus={e => e.target.select()}
                    />
                    <div className="flex-shrink-0">
                      <button onClick={() => copyToClipboard(llmPrompt)} className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50">Copy</button>
                    </div>
                  </div>
                </div>
              )}
              <form onSubmit={handleManualJsonSubmit} className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {importType === 'craft' ? 'PASTE LLM JSON output below' : 'Paste LLM JSON result here:'}
                </label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded bg-white text-xs"
                  value={manualJson}
                  onChange={e => setManualJson(e.target.value)}
                  rows={6}
                  placeholder={importType === 'craft' ? "PASTE LLM JSON output below" : "Paste the JSON output from Gemini, ChatGPT, etc."}
                />
                <div className="flex justify-end mt-2">
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">{importType === 'craft' ? 'Create Itinerary' : 'Import JSON'}</button>
                </div>
              </form>
            </div>
          )}

          {/* Import Type Selector and main form, hidden if showing prompt */}
          {!showPrompt && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Import Source
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setImportType('url')}
                    className={`p-3 text-center rounded-lg border-2 transition duration-200 ${
                      importType === 'url'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={isProcessing}
                  >
                    <div className="text-2xl mb-1">🌐</div>
                    <div className="text-sm font-medium">Website URL</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportType('document')}
                    className={`p-3 text-center rounded-lg border-2 transition duration-200 ${
                      importType === 'document'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={isProcessing}
                  >
                    <div className="text-2xl mb-1">📄</div>
                    <div className="text-sm font-medium">Document File</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportType('text')}
                    className={`p-3 text-center rounded-lg border-2 transition duration-200 ${
                      importType === 'text'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={isProcessing}
                  >
                    <div className="text-2xl mb-1">📝</div>
                    <div className="text-sm font-medium">Text/Email</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportType('craft')}
                    className={`p-3 text-center rounded-lg border-2 transition duration-200 ${
                      importType === 'craft'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={isProcessing}
                  >
                    <div className="text-2xl mb-1">🎨</div>
                    <div className="text-sm font-medium">Craft Trip</div>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Input Fields */}
                <div className="mb-6">
                  {importType === 'url' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="https://example.com/booking-confirmation"
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Paste the URL of a booking confirmation, itinerary, or travel website
                      </p>
                    </div>
                  )}
                  {importType === 'document' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Document File
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.rtf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Upload any document containing booking information (PDF, Word, Text, Excel, images, etc.)
                      </p>
                    </div>
                  )}
                  {importType === 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Content
                      </label>
                      <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Paste booking confirmation email, itinerary text, or travel details..."
                        rows="6"
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Paste text from emails, booking confirmations, or travel documents
                      </p>
                    </div>
                  )}
                  {importType === 'craft' && (
                    <TripCraftForm
                      onSubmit={async (formData) => {
                        setIsProcessing(true);
                        try {
                          const profile = {
                            adults: Number(initialProfile.adults) || 2,
                            children: Number(initialProfile.children) || 0,
                            interests: Array.isArray(initialProfile.interests) ? initialProfile.interests : [],
                            diet: initialProfile.diet || 'everything',
                            state: initialProfile.state,
                            country: initialProfile.country
                          };
                          const result = await aiImportService.importFromSource(JSON.stringify(formData), 'craft', profile);
                          if (result.success) {
                            const withStatus = result.data.map((d, idx) => ({ ...d, id: `craft-${Date.now()}-${idx}`, _status: 'pending' }));
                            setReviewData(withStatus);
                          } else {
                            setLlmPrompt(result.prompt);
                            setShowPrompt(true);
                          }
                        } catch (error) {
                          setLlmPrompt('Error generating itinerary. Please try again.');
                          setShowPrompt(true);
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      onCancel={() => setImportType('url')}
                    />
                  )}
                </div>
                {/* Importer uses trip profile settings from Trip Profile modal */}
                <div className="mb-4 p-3 border rounded bg-gray-50 text-sm text-gray-700">
                  Using trip profile settings (adults, children, interests, diet) from the Trip Profile modal.
                </div>

                {/* Action Buttons - hide when craft form is active */}
                {importType !== 'craft' && (
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className={`
                        flex-1 py-3 px-6 rounded-md font-semibold transition duration-200
                        ${isProcessing
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }
                      `}
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        '🚀 Import with AI'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isProcessing}
                      className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </>
          )}

          {/* Test Samples - hide when craft form is active */}
          {!isProcessing && !showPrompt && importType !== 'craft' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">Try these sample bookings:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleTestSample('hotelBooking')}
                  className="px-3 py-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition duration-200"
                >
                  Hotel Booking
                </button>
                <button
                  onClick={() => handleTestSample('ferryTicket')}
                  className="px-3 py-2 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition duration-200"
                >
                  Ferry Ticket
                </button>
                <button
                  onClick={() => handleTestSample('campingReservation')}
                  className="px-3 py-2 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition duration-200"
                >
                  Camping Site
                </button>
                <button
                  onClick={() => handleTestSample('multipleBookings')}
                  className="px-3 py-2 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition duration-200"
                >
                  Multi-day Trip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIImportModal;
