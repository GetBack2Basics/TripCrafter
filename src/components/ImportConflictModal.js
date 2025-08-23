import React from 'react';

function ImportConflictModal({ conflicts, onResolve, onCancel }) {
  // conflicts: Array of { date, existingItem, importedItem }
  // onResolve: function({ [date]: action })
  // onCancel: function()
  const [choices, setChoices] = React.useState({});

  const handleChoice = (date, action) => {
    setChoices(prev => ({ ...prev, [date]: action }));
  };

  const handleSubmit = () => {
    onResolve(choices);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4 text-indigo-700">Resolve Import Conflicts</h2>
        <p className="mb-4 text-gray-700">Some days already have entries. For each, choose what to do:</p>
        <div className="space-y-6">
          {conflicts.map(({ date, existingItem, importedItem }) => (
            <div key={date} className="border-b pb-4 mb-4">
              <div className="font-semibold text-indigo-600 mb-1">{date}</div>
              <div className="mb-2">
                <span className="font-medium">Existing:</span> {existingItem.type} - {existingItem.title || existingItem.description}
              </div>
              <div className="mb-2">
                <span className="font-medium">Imported:</span> {importedItem.type} - {importedItem.title || importedItem.description}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleChoice(date, 'replace')} className={`px-3 py-1 rounded ${choices[date]==='replace' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Replace</button>
                <button onClick={() => handleChoice(date, 'enroute')} className={`px-3 py-1 rounded ${choices[date]==='enroute' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Add as Enroute</button>
                <button onClick={() => handleChoice(date, 'note')} className={`px-3 py-1 rounded ${choices[date]==='note' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Add as Note</button>
                <button onClick={() => handleChoice(date, 'ignore')} className={`px-3 py-1 rounded ${choices[date]==='ignore' ? 'bg-gray-400 text-white' : 'bg-gray-100'}`}>Ignore</button>
              </div>
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
