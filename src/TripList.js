import React from 'react';

function TripList({ tripItems, editingItem, handleEditClick, handleDeleteItem, handleInputChange, handleSaveEdit, loadingInitialData }) {
  if (tripItems.length === 0 && !loadingInitialData) {
    return (
      <p className="text-center text-gray-500 text-xl py-8">No trip items yet for this trip. Add one above!</p>
    );
  }

  return (
    <div className="space-y-6">
      {tripItems.map((item) => (
        <div key={item.id} className="bg-white p-6 rounded-lg shadow-md border-t-4 border-indigo-500">
          {editingItem && editingItem.id === item.id ? (
            /* Edit Form */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="date"
                name="date"
                value={editingItem.date}
                onChange={handleInputChange}
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              <input
                type="text"
                name="location"
                value={editingItem.location}
                onChange={handleInputChange}
                placeholder="Location"
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              <input
                type="text"
                name="accommodation"
                value={editingItem.accommodation}
                onChange={handleInputChange}
                placeholder="Accommodation"
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              <select
                name="status"
                value={editingItem.status}
                onChange={handleInputChange}
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="Unconfirmed">Unconfirmed</option>
                <option value="Booked">Booked</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <input
                type="text"
                name="travelTime"
                value={editingItem.travelTime}
                onChange={handleInputChange}
                placeholder="Est. Travel Time"
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="text"
                name="activities"
                value={editingItem.activities}
                onChange={handleInputChange}
                placeholder="Activities for the day"
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <textarea
                name="notes"
                value={editingItem.notes}
                onChange={handleInputChange}
                placeholder="Notes"
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 col-span-full"
                rows="2"
              ></textarea>
              <div className="flex justify-end space-x-2 mt-4 col-span-full">
                <button
                  onClick={handleSaveEdit}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300"
                >
                  Save
                </button>
                <button
                  onClick={() => handleEditClick(null)} // Pass null to exit editing mode
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full shadow-md transition duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Display Item */
            <>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500">{item.date}</p>
                  <h3 className="text-xl font-semibold text-indigo-800 mb-1">{item.location}</h3>
                  <p className="text-lg text-gray-700">{item.accommodation}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    item.status === 'Booked' ? 'bg-green-100 text-green-800' :
                    item.status === 'Unconfirmed' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>
              {item.travelTime && (
                <p className="text-md text-gray-600 mb-2">
                  <span className="font-medium">Est. Travel Time:</span> {item.travelTime}
                </p>
              )}
              {item.activities && (
                <p className="text-md text-gray-600 mb-2">
                  <span className="font-medium">Activities:</span> {item.activities}
                </p>
              )}
              {item.notes && (
                <p className="text-md text-gray-600 mb-4">{item.notes}</p>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => handleEditClick(item)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 transform hover:scale-105"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 transform hover:scale-105"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default TripList;
