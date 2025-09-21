import React from 'react';
import { Pen, Trash2, CheckCircle2, XCircle, ArrowLeftCircle, CheckSquare } from 'lucide-react';

function AIImportReview({ importedData, onMerge, onIgnore, onReplace, onEdit, onCancel, onAcceptAllSuggestions, onUndoLast }) {
  // Group entries by date
  const grouped = {};
  importedData.forEach(entry => {
    if (!grouped[entry.date]) grouped[entry.date] = [];
    grouped[entry.date].push(entry);
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-indigo-700">Review Imported Entries</h2>
          <p className="text-gray-600 text-sm">Review and merge imported trip entries. Edit, ignore, or replace items and accept AI suggestions where helpful.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAcceptAllSuggestions} className="flex items-center gap-2 px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 text-sm"><CheckSquare className="w-4 h-4" /> Accept all suggestions</button>
          <button onClick={onUndoLast} className="flex items-center gap-2 px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"><ArrowLeftCircle className="w-4 h-4" /> Undo</button>
        </div>
      </div>
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date} className="border rounded-lg p-4 bg-gray-50">
            <div className="font-semibold text-indigo-700 mb-2">{date}</div>
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id || entry._id || `${date}-${entry.title}`} className="flex items-center gap-3 bg-white rounded shadow p-3">
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{entry.location}</div>
                    <div className="text-xs text-gray-500 mb-1">{entry.type} {entry.accommodation && `- ${entry.accommodation}`}</div>
                            {entry.activities && (
                      <div className="text-xs text-indigo-600">
                                {(() => {
                                  const m = typeof entry.activities === 'string' && entry.activities.match(/^\[AI suggestion\](.*)\[\/AI suggestion\]$/s);
                                  if (m) {
                                    return (
                                      <div className="flex items-center gap-2">
                                        <span className="italic text-indigo-800">{m[1].trim()}</span>
                                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">AI suggestion</span>
                                      </div>
                                    );
                                  }
                                  return <span>{entry.activities}</span>;
                                })()}
                      </div>
                    )}
                    {entry.notes && (
                      <div className="text-xs text-gray-500">
                                {(() => {
                                  const m = typeof entry.notes === 'string' && entry.notes.match(/^\[AI suggestion\](.*)\[\/AI suggestion\]$/s);
                                  if (m) {
                                    return (
                                      <div className="flex items-center gap-2">
                                        <span className="italic text-gray-800">{m[1].trim()}</span>
                                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">AI suggestion</span>
                                      </div>
                                    );
                                  }
                                  return <span>{entry.notes}</span>;
                                })()}
                      </div>
                    )}
                    {entry._status && (
                      <div className="mt-2">
                        {(() => {
                          const map = {
                            approved: { label: 'Marked', classes: 'bg-green-100 text-green-700' },
                            edited: { label: 'Edited', classes: 'bg-indigo-100 text-indigo-700' },
                            ignored: { label: 'Ignored', classes: 'bg-gray-100 text-gray-700' },
                            replaced: { label: 'Replace', classes: 'bg-red-100 text-red-700' },
                            pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-700' }
                          };
                          const info = map[entry._status] || { label: entry._status, classes: 'bg-gray-100 text-gray-700' };
                          return (<span className={`inline-block text-xs px-2 py-1 rounded ${info.classes}`}>{info.label}</span>);
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(entry)} className="p-2 rounded hover:bg-indigo-100 text-indigo-600" title="Edit & Mark"><Pen className="w-4 h-4" /></button>
                    <button onClick={() => onMerge(entry)} className="p-2 rounded hover:bg-green-100 text-green-600" title="Mark as Import"><CheckCircle2 className="w-4 h-4" /></button>
                    <button onClick={() => onIgnore(entry)} className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Ignore"><XCircle className="w-4 h-4" /></button>
                    <button onClick={() => onReplace(entry)} className="p-2 rounded hover:bg-red-100 text-red-600" title="Mark as Replace"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-6">
        <button onClick={onCancel} className="px-6 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300">Cancel</button>
      </div>
    </div>
  );
}

export default AIImportReview;
