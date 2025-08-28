import React, { useState } from 'react';
import { GripVertical, ChevronDown, ChevronUp, Car, BedDouble, Tent, Ship, Info, Pen, Trash2 } from 'lucide-react';

function getTypeIcon(type, item) {
  if (type === 'roofed') return <BedDouble className="inline w-5 h-5 text-indigo-400" title="Title" />;
  if (type === 'camp') return <Tent className="inline w-5 h-5 text-green-500" title="Camping" />;
  if (type === 'enroute') return <Car className="inline w-5 h-5 text-orange-400" title="Enroute" />;
  if (type === 'note') return <Info className="inline w-5 h-5 text-gray-400" title="Note" />;
  if (type === 'ferry' || (item && item.title?.toLowerCase().includes('spirit'))) return <Ship className="inline w-5 h-5 text-blue-400" title="Ferry" />;
  if (type === 'car') return <Car className="inline w-5 h-5 text-gray-500" title="Car" />;
  return null;
}

function TripTable({ tripItems = [], handleEditClick, handleDeleteItem, loadingInitialData, handleReorder }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (tripItems.length === 0 && !loadingInitialData) {
    return (
      <p className="text-center text-gray-400 text-lg py-8">No trip items yet for this trip. Add one above!</p>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Drag and drop handlers
  const handleDragStart = (index) => setDraggedIndex(index);
  const handleDragOver = (index) => setDragOverIndex(index);
  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;
    if (handleReorder) handleReorder(draggedIndex, index);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-indigo-50">
          <tr>
            <th></th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activities</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tripItems.map((item, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <React.Fragment key={item.id}>
                <tr
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={() => handleDragOver(idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={
                    `${dragOverIndex === idx ? 'bg-indigo-50' : ''} ${draggedIndex === idx ? 'opacity-50' : ''}`
                  }
                >
                  <td className="px-2 py-3 cursor-grab text-gray-400 align-middle">
                    <GripVertical className="w-5 h-5" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDate(item.date)}
                    <div className="flex gap-2 mt-1 items-center">
                      {item._pendingMerge && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded mr-2">Pending merge</span>
                      )}
                      {/* Only show icon by type, no text */}
                      {['roofed', 'camp', 'enroute', 'note', 'ferry', 'car'].includes(item.type) && (
                        <span>{getTypeIcon(item.type, item)}</span>
                      )}
                      {/* Show travel time and distance if available */}
                      {(item.travelTime || item.distance) && (
                        <span className="text-xs text-gray-500 ml-2">
                          {item.travelTime}{item.travelTime && item.distance ? ' • ' : ''}{item.distance}
                        </span>
                      )}
                      <button onClick={() => handleEditClick && handleEditClick(item)} className="p-1 rounded hover:bg-indigo-100 text-indigo-600" title="Edit">
                        <Pen className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteItem && handleDeleteItem(item.id)} className="p-1 rounded hover:bg-red-100 text-red-600" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.location}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                      {item.title && item.titleLink ? (
                        <a href={item.titleLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                          {item.title}
                        </a>
                      ) : (
                        item.title
                      )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.activities && item.activityLink ? (
                      <a href={item.activityLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                        {item.activities}
                      </a>
                    ) : (
                      item.activities
                    )}
                  </td>
                  <td className="px-2 py-3 align-middle">
                    <button onClick={() => setExpandedIndex(isExpanded ? null : idx)} className="text-gray-400 hover:text-indigo-600">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-indigo-50">
                    <td colSpan={9} className="px-6 py-4 text-xs text-gray-700">
                      {item.travelTime && (
                        <div className="mb-1 flex items-center"><Car className="w-4 h-4 mr-1 inline" />{item.travelTime}</div>
                      )}
                      {item.notes && (
                        <div className="mb-1"><span className="font-medium">Notes:</span> {item.notes}</div>
                      )}
                      {item.status && (
                        <div className="mb-1"><span className="font-medium">Status:</span> {item.status}</div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TripTable;