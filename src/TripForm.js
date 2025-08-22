import React from 'react';

function TripForm({ newItem, handleInputChange, onAddItem, openModal }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newItem.date || !newItem.location || !newItem.accommodation) {
      openModal('Please fill in all required fields (Date, Location, Accommodation).');
      return;
    }
    onAddItem();
  };

  return (
    <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-inner">
      <h2 className="text-2xl font-semibold text-indigo-600 mb-4">Add New Trip Item</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            type="date"
            name="date"
            value={newItem.date}
            onChange={handleInputChange}
            placeholder="Date"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
          <input
            type="text"
            name="location"
            value={newItem.location}
            onChange={handleInputChange}
            placeholder="Location"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
          <input
            type="text"
            name="accommodation"
            value={newItem.accommodation}
            onChange={handleInputChange}
            placeholder="Accommodation"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
          <select
            name="status"
            value={newItem.status}
            onChange={handleInputChange}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="Unconfirmed">Unconfirmed</option>
            <option value="Booked">Booked</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <input
            type="text"
            name="travelTime"
            value={newItem.travelTime}
            onChange={handleInputChange}
            placeholder="Est. Travel Time (e.g., 2h 30m)"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="text"
            name="activities"
            value={newItem.activities}
            onChange={handleInputChange}
            placeholder="Activities for the day"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <textarea
            name="notes"
            value={newItem.notes}
            onChange={handleInputChange}
            placeholder="Notes (e.g., guest details)"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 col-span-1 md:col-span-2 lg:col-span-3"
            rows="2"
          ></textarea>
        </div>
        <button
          type="submit"
          className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          Add Trip Item
        </button>
      </form>
    </div>
  );
}

export default TripForm;
