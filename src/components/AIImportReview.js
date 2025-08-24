import React, { useState } from 'react';
import { Pen, Trash2, CheckCircle2, XCircle } from 'lucide-react';

function AIImportReview({ importedData, onMerge, onIgnore, onReplace, onEdit, onCancel }) {
  // Group entries by date
  const grouped = {};
  importedData.forEach(entry => {
    if (!grouped[entry.date]) grouped[entry.date] = [];
    grouped[entry.date].push(entry);
  });

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-indigo-700 mb-4">Review Imported Entries</h2>
      <p className="text-gray-600 mb-4">Review and merge imported trip entries. You can edit, ignore, or replace existing entries for each day. Days can have multiple entries (accommodation, enroute, notes).</p>
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date} className="border rounded-lg p-4 bg-gray-50">
            <div className="font-semibold text-indigo-700 mb-2">{date}</div>
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white rounded shadow p-3">
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{entry.location}</div>
                    <div className="text-xs text-gray-500 mb-1">{entry.type} {entry.accommodation && `- ${entry.accommodation}`}</div>
                    {entry.activities && <div className="text-xs text-indigo-600">{entry.activities}</div>}
                    {entry.notes && <div className="text-xs text-gray-500">{entry.notes}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(entry)} className="p-2 rounded hover:bg-indigo-100 text-indigo-600" title="Edit & Merge"><Pen className="w-4 h-4" /></button>
                    <button onClick={() => onMerge(entry)} className="p-2 rounded hover:bg-green-100 text-green-600" title="Merge"><CheckCircle2 className="w-4 h-4" /></button>
                    <button onClick={() => onIgnore(entry)} className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Ignore"><XCircle className="w-4 h-4" /></button>
                    <button onClick={() => onReplace(entry)} className="p-2 rounded hover:bg-red-100 text-red-600" title="Delete & Replace"><Trash2 className="w-4 h-4" /></button>
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
