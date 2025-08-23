import React, { useState } from 'react';

function TripList({ tripItems, editingItem, handleEditClick, handleDeleteItem, handleMoveUp, handleMoveDown, handleInputChange, handleSaveEdit, loadingInitialData }) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  if (tripItems.length === 0 && !loadingInitialData) {
    return (
      <p className="text-center text-gray-500 text-xl py-8">No trip items yet for this trip. Add one above!</p>
    );
  }

  // Drag and Drop handlers
  const handleDragStart = (e, item, index) => {
    setDraggedItem({ item, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedItem && draggedItem.index !== targetIndex) {
      // Calculate how many positions to move
      const sourceIndex = draggedItem.index;
      
      // Move the item by calling handleMoveUp/Down multiple times
      if (sourceIndex < targetIndex) {
        // Moving down - call handleMoveDown multiple times
        for (let i = 0; i < (targetIndex - sourceIndex); i++) {
          handleMoveDown(draggedItem.item.id);
        }
      } else {
        // Moving up - call handleMoveUp multiple times
        for (let i = 0; i < (sourceIndex - targetIndex); i++) {
          handleMoveUp(draggedItem.item.id);
        }
      }
    }
    
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-6">
      {tripItems.map((item, index) => (
        <div 
          key={item.id} 
          className={`bg-white p-6 rounded-lg shadow-md border-t-4 border-indigo-500 cursor-move transition-all duration-200
            ${dragOverIndex === index ? 'border-l-4 border-l-indigo-500 transform scale-[1.02]' : ''}
            ${draggedItem?.index === index ? 'opacity-50 transform scale-95' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, item, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
        >
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
                <option value="note">Note</option>
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
              {/* Drag Handle Indicator */}
              <div className="flex justify-center mb-2">
                <svg className="w-5 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 8">
                  <circle cx="3" cy="2" r="1"/>
                  <circle cx="9" cy="2" r="1"/>
                  <circle cx="15" cy="2" r="1"/>
                  <circle cx="21" cy="2" r="1"/>
                  <circle cx="3" cy="6" r="1"/>
                  <circle cx="9" cy="6" r="1"/>
                  <circle cx="15" cy="6" r="1"/>
                  <circle cx="21" cy="6" r="1"/>
                </svg>
              </div>
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
                    item.type === 'note' ? 'bg-purple-100 text-purple-800' :
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
                    {item.type === 'roofed' ? 'Booking:' : item.type === 'camp' ? 'Camping:' : item.type === 'note' ? 'Things to Do:' : 'Activities:'}
                  </span> 
                  <a 
                    href={item.activityLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline ml-1"
                  >
                    {item.type === 'roofed' ? 'View accommodation options on Booking.com' : 
                     item.type === 'camp' ? 'Find camping spots on Google' : 
                     item.type === 'note' ? 'Discover things to do on Google' :
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
                    title="Move up (or drag and drop)"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveDown(item.id)}
                    disabled={index === tripItems.length - 1}
                    className={`${index === tripItems.length - 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transform hover:scale-105'} font-bold py-2 px-3 rounded-full shadow-md transition duration-300`}
                    title="Move down (or drag and drop)"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
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
