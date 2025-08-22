import React from 'react';

function TripTable({ tripItems, handleEditClick, handleDeleteItem, loadingInitialData }) {
  if (tripItems.length === 0 && !loadingInitialData) {
    return (
      <p className="text-center text-gray-500 text-xl py-8">No trip items yet for this trip. Add one above!</p>
    );
  }

  // Helper function to format date
  const formatDate = (dateString) => {
    const options = { weekday: 'short', day: 'numeric' };
    const date = new Date(dateString);
    // Check if month changes from previous item to include month
    // This logic would ideally be done in App.js or a data processing utility
    // For now, we'll just format each date independently.
    return date.toLocaleDateString('en-AU', options);
  };

  // Helper component for truncated text with tooltip
  const TruncatedText = ({ text, maxLength = 50 }) => {
    const [showTooltip, setShowTooltip] = React.useState(false);

    if (!text) return null;

    if (text.length <= maxLength) {
      return <span>{text}</span>;
    }

    return (
      <div className="relative inline-block">
        <span
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="cursor-help overflow-hidden text-ellipsis whitespace-nowrap block max-w-[150px] md:max-w-none"
        >
          {text.substring(0, maxLength)}...
        </span>
        {showTooltip && (
          <div className="absolute z-10 p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg -mt-10 left-1/2 -translate-x-1/2 whitespace-normal max-w-xs">
            {text}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
      {/* Font Awesome CDN for icons */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" xintegrity="sha512-iBBXm8fW90+nuLcSKlbmrPcLa0OT92xO1BIsZ+ywDWZCvqsWgccV3gFoRBv0z+8dLJgyAHIhR35VZc2oM/gI1w==" crossOrigin="anonymous" referrerPolicy="no-referrer" />

      {/* Responsive table structure */}
      <div className="hidden md:block"> {/* Desktop Table View */}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-indigo-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Accommodation
              </th>
              {/* Removed Status column */}
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Est. Travel Time
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activities
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th scope="col" className="relative px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tripItems.map((item, index) => (
              <tr key={item.id} className={item.status === 'Booked' ? 'bg-green-50' : item.status === 'Unconfirmed' ? 'bg-yellow-50' : item.status === 'Cancelled' ? 'bg-red-50' : ''}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatDate(item.date)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  <TruncatedText text={item.location} maxLength={30} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  <TruncatedText text={item.accommodation} maxLength={30} />
                </td>
                {/* Status is now indicated by row color */}
                <td className="px-4 py-3 text-sm text-gray-700">
                  <TruncatedText text={item.travelTime} maxLength={20} /> {/* Increased maxLength */}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <TruncatedText text={item.activities} maxLength={50} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <TruncatedText text={item.notes} maxLength={50} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEditClick(item)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {tripItems.map((item) => (
          <div key={item.id} className={`shadow-md rounded-lg p-4 border-t-4 ${item.status === 'Booked' ? 'border-green-500' : item.status === 'Unconfirmed' ? 'border-yellow-500' : item.status === 'Cancelled' ? 'border-red-500' : 'border-gray-300'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-900">{formatDate(item.date)}</span>
              {/* Status icon for mobile view */}
              {item.status === 'Booked' && <i className="fas fa-check-circle text-green-500 text-lg"></i>}
              {item.status === 'Unconfirmed' && <i className="fas fa-exclamation-triangle text-yellow-500 text-lg"></i>}
              {item.status === 'Cancelled' && <i className="fas fa-times-circle text-red-500 text-lg"></i>}
              {item.status === 'Not booked' && <i className="fas fa-question-circle text-gray-500 text-lg"></i>}
            </div>
            <h3 className="text-lg font-bold text-indigo-800 mb-1">{item.location}</h3>
            <p className="text-sm text-gray-700 mb-2">{item.accommodation}</p>
            {item.travelTime && (
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Est. Travel Time:</span> <TruncatedText text={item.travelTime} maxLength={40} />
              </p>
            )}
            {item.activities && (
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Activities:</span> <TruncatedText text={item.activities} maxLength={80} />
              </p>
            )}
            {item.notes && (
              <p className="text-xs text-gray-600 mb-2">
                <span className="font-medium">Notes:</span> <TruncatedText text={item.notes} maxLength={80} />
              </p>
            )}
            <div className="flex justify-end space-x-2 mt-3">
              <button
                onClick={() => handleEditClick(item)}
                className="text-indigo-600 hover:text-indigo-900 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="text-red-600 hover:text-red-900 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TripTable;
