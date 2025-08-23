import React from 'react';

function TripList({ tripItems, editingItem, handleEditClick, handleDeleteItem, handleMoveUp, handleMoveDown, handleInputChange, handleSaveEdit, loadingInitialData }) {
  if (tripItems.length === 0 && !loadingInitialData) {
    return (
      <p className="text-center text-gray-500 text-xl py-8">No trip items yet for this trip. Add one above!</p>
    );
  }

  return (
    <div className="space-y-6">
      {tripItems.map((item, index) => (
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
              <select
                name="type"
                value={editingItem.type}
                onChange={handleInputChange}
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="roofed">Roofed</option>
                <option value="camp">Camp</option>
                <option value="enroute">Enroute</option>
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
              <input
                type="url"
                name="activityLink"
                value={editingItem.activityLink}
                onChange={handleInputChange}
                placeholder="Activity Link"
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
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
                <div className="flex flex-col items-end space-y-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      item.status === 'Booked' ? 'bg-green-100 text-green-800' :
                      item.status === 'Unconfirmed' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.status}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.type === 'roofed' ? 'bg-blue-100 text-blue-800' :
                    item.type === 'camp' ? 'bg-green-100 text-green-800' :
                    item.type === 'enroute' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.type || 'roofed'}
                  </span>
                </div>
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
              {item.activityLink && (
                <p className="text-md text-gray-600 mb-4">
                  <span className="font-medium">
                    {item.type === 'roofed' ? 'Booking:' : item.type === 'camp' ? 'Camping:' : 'Activities:'}
                  </span> 
                  <a 
                    href={item.activityLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline ml-1"
                  >
                    {item.type === 'roofed' ? 'View accommodation options on Booking.com' : 
                     item.type === 'camp' ? 'Find camping spots on Google' : 
                     'Discover local activities on Google'}
                  </a>
                </p>
              )}
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleMoveUp(item.id)}
                    disabled={index === 0}
                    className={`${index === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transform hover:scale-105'} font-bold py-2 px-3 rounded-full shadow-md transition duration-300`}
                    title="Move up"
                  >
                    <i className="fas fa-chevron-up"></i>
                  </button>
                  <button
                    onClick={() => handleMoveDown(item.id)}
                    disabled={index === tripItems.length - 1}
                    className={`${index === tripItems.length - 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transform hover:scale-105'} font-bold py-2 px-3 rounded-full shadow-md transition duration-300`}
                    title="Move down"
                  >
                    <i className="fas fa-chevron-down"></i>
                  </button>
                </div>
                <div className="flex space-x-2">
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
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default TripList;
