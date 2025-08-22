import React, { useState } from 'react';

function TripTable({ tripItems, handleEditClick, handleDeleteItem, loadingInitialData }) {
  const [expandedRowId, setExpandedRowId] = useState(null); // State to track which row is expanded

  if (tripItems.length === 0 && !loadingInitialData) {
    return (
      <p className="text-center text-gray-500 text-xl py-8">No trip items yet for this trip. Add one above!</p>
    );
  }

  // Helper function to format date: DayofWeek-Day (e.g., Tue-29) with month if it changes
  const formatDate = (dateString, index, allItems, showMonthOnMobile = false) => {
    const date = new Date(dateString);
    const options = { weekday: 'short', day: 'numeric' };
    let formattedDate = date.toLocaleDateString('en-AU', options);

    // Add month if it's the first item, or if the month changes from the previous item
    if (index === 0) {
      formattedDate = date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    } else {
      const prevDate = new Date(allItems[index - 1].date);
      if (date.getMonth() !== prevDate.getMonth()) {
        formattedDate = date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
      }
    }

    // Always show month on mobile if specified
    if (showMonthOnMobile && window.innerWidth < 768) { // md breakpoint is 768px
      formattedDate = date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    return formattedDate;
  };

  // Helper component for truncated text with tooltip, now more flexible
  const TruncatedText = ({ text, maxLength = 30, fullWidth = false }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!text) return null;

    // If fullWidth is true, don't truncate and don't show tooltip
    if (fullWidth || text.length <= maxLength) {
      return <span>{text}</span>;
    }

    return (
      <div className="relative inline-block max-w-full">
        <span
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="cursor-help overflow-hidden text-ellipsis whitespace-nowrap block max-w-full"
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

  const toggleRowExpansion = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
      {/* Font Awesome CDN for icons */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" xintegrity="sha512-iBBXm8fW90+nuLcSKlbmrPcLa0OT92xO1BIsZ+ywDWZCvqsWgccV3gFoRBv0z+8dLJgyAHIhR35VZc2oM/gI1w==" crossOrigin="anonymous" referrerPolicy="no-referrer" />

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-indigo-50">
            <tr>
              <th scope="col" className="w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="w-[20%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th scope="col" className="w-[20%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Accommodation
              </th>
              <th scope="col" className="w-[30%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activities
              </th>
              <th scope="col" className="w-[10%] relative px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
              <th scope="col" className="w-[5%] relative px-4 py-3">
                {/* Empty header for expand toggle */}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tripItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <tr className={`${item.status === 'Booked' ? 'bg-green-50' : item.status === 'Unconfirmed' ? 'bg-yellow-50' : item.status === 'Cancelled' ? 'bg-red-50' : ''} hover:bg-gray-100`}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDate(item.date, index, tripItems)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <TruncatedText text={item.location} maxLength={40} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <TruncatedText text={item.accommodation} maxLength={40} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <TruncatedText text={item.activities} maxLength={60} />
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
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button onClick={() => toggleRowExpansion(item.id)} className="text-gray-500 hover:text-gray-700">
                      <i className={`fas ${expandedRowId === item.id ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                    </button>
                  </td>
                </tr>
                {expandedRowId === item.id && (
                  <tr className={`${item.status === 'Booked' ? 'bg-green-50' : item.status === 'Unconfirmed' ? 'bg-yellow-50' : item.status === 'Cancelled' ? 'bg-red-50' : ''} border-t border-gray-200`}>
                    <td colSpan="6" className="px-4 py-3 text-sm text-gray-700"> {/* Adjusted colSpan */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2"> {/* Adjusted grid for better layout */}
                        {item.travelTime && (
                          <div><span className="font-medium">Est. Travel Time:</span> <TruncatedText text={item.travelTime} fullWidth={true} /></div>
                        )}
                        {item.notes && (
                          <div><span className="font-medium">Notes:</span> <TruncatedText text={item.notes} fullWidth={true} /></div>
                        )}
                        {/* Status icon for expanded row */}
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Status:</span>
                          {item.status === 'Booked' && <i className="fas fa-check-circle text-green-500 text-lg" title="Booked"></i>}
                          {item.status === 'Unconfirmed' && <i className="fas fa-exclamation-triangle text-yellow-500 text-lg" title="Unconfirmed"></i>}
                          {item.status === 'Cancelled' && <i className="fas fa-times-circle text-red-500 text-lg" title="Cancelled"></i>}
                          {item.status === 'Not booked' && <i className="fas fa-question-circle text-gray-500 text-lg" title="Not booked"></i>}
                        </div>
                      </div>
                    </td>
                    <td colSpan="2"></td> {/* Empty cells for actions and toggle */}
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {tripItems.map((item, index) => (
          <div key={item.id} className={`shadow-md rounded-lg p-4 border-t-4 ${item.status === 'Booked' ? 'border-green-500' : item.status === 'Unconfirmed' ? 'border-yellow-500' : item.status === 'Cancelled' ? 'border-red-500' : 'border-gray-300'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-900">{formatDate(item.date, index, tripItems, true)}</span> {/* Show month on mobile */}
              {item.status === 'Booked' && <i className="fas fa-check-circle text-green-500 text-lg" title="Booked"></i>}
              {item.status === 'Unconfirmed' && <i className="fas fa-exclamation-triangle text-yellow-500 text-lg" title="Unconfirmed"></i>}
              {item.status === 'Cancelled' && <i className="fas fa-times-circle text-red-500 text-lg" title="Cancelled"></i>}
              {item.status === 'Not booked' && <i className="fas fa-question-circle text-gray-500 text-lg" title="Not booked"></i>}
            </div>
            <h3 className="text-lg font-bold text-indigo-800 mb-1">{item.location}</h3>
            <p className="text-sm text-gray-700 mb-2">{item.accommodation}</p>
            {item.travelTime && (
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Est. Travel Time:</span> <TruncatedText text={item.travelTime} maxLength={60} />
              </p>
            )}
            {item.activities && (
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Activities:</span> <TruncatedText text={item.activities} maxLength={100} />
              </p>
            )}
            {item.notes && (
              <p className="text-xs text-gray-600 mb-2">
                <span className="font-medium">Notes:</span> <TruncatedText text={item.notes} maxLength={100} />
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
