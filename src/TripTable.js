import React from 'react';

function TripTable({ tripItems, handleEditClick, handleDeleteItem, loadingInitialData }) {
  if (tripItems.length === 0 && !loadingInitialData) {
    return (
      <p className="text-center text-gray-500 text-xl py-8">No trip items yet for this trip. Add one above!</p>
    );
  }

  // Helper function to render status with an icon and appropriate styling
  const renderStatus = (status) => {
    let iconClass = '';
    let textColor = '';
    let bgColor = '';
    let statusText = '';

    switch (status) {
      case 'Booked':
        iconClass = 'fas fa-check-circle';
        textColor = 'text-green-800';
        bgColor = 'bg-green-100';
        statusText = 'Booked';
        break;
      case 'Unconfirmed':
        iconClass = 'fas fa-exclamation-triangle';
        textColor = 'text-yellow-800';
        bgColor = 'bg-yellow-100';
        statusText = 'Unconfirmed';
        break;
      case 'Cancelled':
        iconClass = 'fas fa-times-circle';
        textColor = 'text-red-800';
        bgColor = 'bg-red-100';
        statusText = 'Cancelled';
        break;
      default:
        iconClass = 'fas fa-question-circle';
        textColor = 'text-gray-800';
        bgColor = 'bg-gray-100';
        statusText = 'Unknown';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${bgColor} ${textColor}`}>
        <i className={`${iconClass} mr-1`}></i>
        {statusText}
      </span>
    );
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
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
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
            {tripItems.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.date}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  <TruncatedText text={item.location} maxLength={30} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  <TruncatedText text={item.accommodation} maxLength={30} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {renderStatus(item.status)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {item.travelTime}
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
          <div key={item.id} className="bg-white shadow-md rounded-lg p-4 border-t-4 border-indigo-500">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-900">{item.date}</span>
              {renderStatus(item.status)}
            </div>
            <h3 className="text-lg font-bold text-indigo-800 mb-1">{item.location}</h3>
            <p className="text-sm text-gray-700 mb-2">{item.accommodation}</p>
            {item.travelTime && (
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Est. Travel Time:</span> {item.travelTime}
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
