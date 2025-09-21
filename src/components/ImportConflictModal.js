import React from 'react';


function ImportConflictModal({ conflicts, onResolve, onCancel }) {
  // conflicts: Array of { date, existingItem, importedItem }
  // onResolve: function({ [date]: { action, importedEdit } })
  // onCancel: function()
  const [choices, setChoices] = React.useState({});
  // Store editable imported entries by date
  const [importedEdits, setImportedEdits] = React.useState(() => {
    const initial = {};
    conflicts.forEach(({ date, importedItem }) => {
      initial[date] = { ...importedItem };
    });
    return initial;
  });

  const handleChoice = (date, action) => {
    setChoices(prev => ({ ...prev, [date]: action }));
  };

  const handleEdit = (date, field, value) => {
    setImportedEdits(prev => ({
      ...prev,
      [date]: { ...prev[date], [field]: value },
    }));
  };

  const handleSubmit = () => {
    // Pass both the action and the edited imported entry for each date
    const result = {};
    Object.keys(choices).forEach(date => {
      result[date] = {
        action: choices[date],
        importedEdit: importedEdits[date],
      };
    });
    onResolve(result);
  };

  // Helper to render all fields for a trip entry
  const renderFields = (entry, editable, date) => {
    const fields = [
      'location',
      'accommodation',
      'status',
      'type',
      'travelTime',
      'activities',
      'notes',
    ];
    return (
      <div className="grid grid-cols-2 gap-2">
        {fields.map(field => (
          <div key={field} className="flex flex-col mb-1">
            <span className="text-xs text-gray-500">{field}</span>
            {editable ? (
              <input
                className="border rounded px-2 py-1 text-sm"
                value={entry[field] || ''}
                onChange={e => handleEdit(date, field, e.target.value)}
              />
            ) : (
              <span className="text-gray-800 text-sm">{entry[field] || <span className="text-gray-400">-</span>}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4 text-indigo-700">Resolve Import Conflicts</h2>
        <p className="mb-4 text-gray-700">Some days already have entries. For each, review, edit, and choose what to do:</p>
        <div className="space-y-8">
          {conflicts.map(({ date, existingItem, importedItem }) => (
            <div key={date} className="border-b pb-6 mb-6">
              <div className="font-semibold text-indigo-600 mb-2 text-lg">{date}</div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="font-medium mb-1">Existing Entry</div>
                  {renderFields(existingItem, false, date)}
                </div>
                <div>
                  <div className="font-medium mb-1">Imported Entry (editable)</div>
                  {renderFields(importedEdits[date], true, date)}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => handleChoice(date, 'override')} className={`px-3 py-1 rounded ${choices[date]==='override' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Override</button>
                <button onClick={() => handleChoice(date, 'merge')} className={`px-3 py-1 rounded ${choices[date]==='merge' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Merge</button>
                <button onClick={() => handleChoice(date, 'ignore')} className={`px-3 py-1 rounded ${choices[date]==='ignore' ? 'bg-gray-400 text-white' : 'bg-gray-100'}`}>Ignore</button>
              </div>
              {choices[date] && (
                <div className="mt-2 text-xs text-gray-600">Selected: <span className="font-semibold">{choices[date]}</span></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="px-6 py-2 border rounded text-gray-700">Cancel</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded">Apply Choices</button>
        </div>
      </div>
    </div>
  );
}

export default ImportConflictModal;
