import React, { useEffect, useState } from 'react';

function TripForm({ newItem, handleInputChange, onAddItem, onSaveEdit, onCancelEdit, openModal, isEditing }) {
  const [formData, setFormData] = useState(newItem);

  useEffect(() => {
    setFormData(newItem); // Update form data when newItem prop changes (e.g., when editingItem is set)
  }, [newItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date || !formData.location || !formData.accommodation) {
      openModal('Please fill in all required fields (Date, Location, Accommodation).');
      return;
    }

    if (isEditing) {
      onSaveEdit(); // Call the save edit handler from App.js
    } else {
      onAddItem(); // Call the add item handler from App.js
    }
  };

  const handleFormChange = (e) => {
    handleInputChange(e); // Pass the event up to App.js
    setFormData({ ...formData, [e.target.name]: e.target.value }); // Also update local state for immediate feedback
  };

  return (
    <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-inner">
      <h2 className="text-2xl font-semibold text-indigo-600 mb-4">
        {isEditing ? 'Edit Trip Item' : 'Add New Trip Item'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleFormChange}
            placeholder="Date"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleFormChange}
            placeholder="Location"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
          <input
            type="text"
            name="accommodation"
            value={formData.accommodation}
            onChange={handleFormChange}
            placeholder="Accommodation"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
          <select
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="Unconfirmed">Unconfirmed</option>
            <option value="Booked">Booked</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Not booked">Not booked</option>
          </select>
          <input
            type="text"
            name="travelTime"
            value={formData.travelTime}
            onChange={handleFormChange}
            placeholder="Est. Travel Time (e.g., 2h 30m)"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="text"
            name="activities"
            value={formData.activities}
            onChange={handleFormChange}
            placeholder="Activities for the day"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="url"
            name="bookingCom"
            value={formData.bookingCom}
            onChange={handleFormChange}
            placeholder="Booking.com URL (auto-generated)"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
            title="This URL is auto-generated based on location and date, but you can edit it manually"
          />
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleFormChange}
            placeholder="Notes (e.g., guest details)"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 col-span-1 md:col-span-2 lg:col-span-3"
            rows="2"
          ></textarea>
        </div>
        <div className="flex justify-end space-x-4 mt-6">
          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel Edit
            </button>
          )}
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {isEditing ? 'Save Changes' : 'Add Trip Item'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TripForm;
