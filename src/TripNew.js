import React, { useState } from 'react';

const TripNew = ({ 
  isOpen, 
  onClose, 
  onCreateTrip,
  userId,
  appIdentifier 
}) => {
  const [tripData, setTripData] = useState({
    name: '',
    state: '',
    country: '',
    description: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTripData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      // TODO: Implement actual trip creation logic
      console.log('Creating new trip with data:', tripData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call the onCreateTrip callback
      onCreateTrip(tripData);
      
      // Reset form and close modal
      setTripData({ name: '', state: '', country: '', description: '' });
      onClose();
    } catch (error) {
      console.error('Error creating trip:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setTripData({ name: '', state: '', country: '', description: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-indigo-700">Create New Trip</h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trip Name *
            </label>
            <input
              type="text"
              name="name"
              value={tripData.name}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., Tasmania 2025 Adventure"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State/Province *
            </label>
            <input
              type="text"
              name="state"
              value={tripData.state}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., Tasmania, California, New South Wales"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country *
            </label>
            <input
              type="text"
              name="country"
              value={tripData.country}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g., Australia, USA, Canada"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={tripData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Brief description of your trip..."
            />
          </div>
          
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <strong>Note:</strong> State and country help ensure accurate location searches throughout your trip planning.
          </div>
          
          <div className="flex space-x-2 mt-6">
            <button
              type="submit"
              disabled={isCreating || !tripData.name || !tripData.state || !tripData.country}
              className={`flex-1 font-bold py-2 px-4 rounded-md transition duration-300 ${
                isCreating || !tripData.name || !tripData.state || !tripData.country
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isCreating ? 'Creating...' : 'Create Trip'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCreating}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-md transition duration-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TripNew;
