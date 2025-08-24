import React, { useEffect, useState } from 'react';

// Figma-aligned TripForm: modern input styling, clear headers, helper text, responsive
function TripForm({ newItem, handleInputChange, onAddItem, onSaveEdit, onCancelEdit, openModal, isEditing }) {
  const [formData, setFormData] = useState(newItem);

  useEffect(() => {
    setFormData(newItem);
  }, [newItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date || !formData.location || !formData.accommodation) {
      openModal('Please fill in all required fields (Date, Location, Accommodation).');
      return;
    }
    if (isEditing) {
      onSaveEdit();
    } else {
      onAddItem();
    }
  };

  const handleFormChange = (e) => {
    handleInputChange(e);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
        <div className="mb-8 p-8 bg-white rounded-2xl shadow-lg border border-gray-100 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-indigo-700 mb-2">
            {isEditing ? 'Edit Trip Item' : 'Add New Trip Item'}
          </h2>
          <div className="text-gray-500 text-sm mb-6">Fill in the details for your trip day. Activity links are auto-generated based on type and location.</div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleFormChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleFormChange}
                  placeholder="e.g. Hobart, Cradle Mountain"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Accommodation</label>
                <input
                  type="text"
                  name="accommodation"
                  value={formData.accommodation}
                  onChange={handleFormChange}
                  placeholder="e.g. Hotel, Cabin, Campground"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="Unconfirmed">Unconfirmed</option>
                  <option value="Booked">Booked</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Not booked">Not booked</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  title="Type determines the activity link: Roofed=Booking.com, Camp=Google campsites, Enroute=Google activities, Note=Google things to do"
                >
                  <option value="roofed">Roofed</option>
                  <option value="camp">Camp</option>
                  <option value="enroute">Enroute</option>
                  <option value="note">Note</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Est. Travel Time</label>
                <input
                  type="text"
                  name="travelTime"
                  value={formData.travelTime}
                  onChange={handleFormChange}
                  placeholder="e.g. 2h 30m"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Activities</label>
                <input
                  type="text"
                  name="activities"
                  value={formData.activities}
                  onChange={handleFormChange}
                  placeholder="e.g. Hiking, Museum, Food Tour"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Activity Link</label>
                <input
                  type="url"
                  name="activityLink"
                  value={formData.activityLink}
                  onChange={handleFormChange}
                  placeholder="Auto-generated based on type/location"
                  className="w-full p-3 border border-gray-100 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  title="This URL is auto-generated based on type and location, but you can edit it manually"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Notes (e.g., guest details, reminders)"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  rows="2"
                ></textarea>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-8">
              <button
                type="button"
                onClick={onCancelEdit}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 shadow"
              >
                {isEditing ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
  );
}

export default TripForm;
