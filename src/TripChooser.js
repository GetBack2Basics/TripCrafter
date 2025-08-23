import React, { useState, useRef, useEffect } from 'react';

const TripChooser = ({ 
  trips = [], 
  onSelectTrip,
  onCreateNewTrip,
  currentTripId,
  currentTripName = 'Select Trip'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTripSelect = (tripId) => {
    onSelectTrip(tripId);
    setIsOpen(false);
  };

  const handleCreateNewTrip = () => {
    onCreateNewTrip();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 transform hover:scale-105 flex items-center space-x-2"
      >
        <span className="truncate max-w-32">{currentTripName}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="py-2">
            {/* Trips List */}
            {trips.length > 0 ? (
              trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => handleTripSelect(trip.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition duration-150 ${
                    trip.id === currentTripId ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 truncate">
                        {trip.name || 'Unnamed Trip'}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {trip.state && trip.country ? `${trip.state}, ${trip.country}` : 'Location not set'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {trip.shared ? 'Shared with you' : 'Your trip'} • 
                        {trip.createdAt ? ` ${new Date(trip.createdAt).toLocaleDateString()}` : ' Unknown date'}
                      </div>
                    </div>
                    {trip.id === currentTripId && (
                      <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0">
                        Current
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-500 text-center">
                No trips found
              </div>
            )}
            
            {/* Separator */}
            {trips.length > 0 && (
              <div className="border-t border-gray-200 my-1"></div>
            )}
            
            {/* Create New Trip Option */}
            <button
              onClick={handleCreateNewTrip}
              className="w-full text-left px-4 py-3 hover:bg-green-50 transition duration-150 text-green-600 font-semibold"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create New Trip</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripChooser;
