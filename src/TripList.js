
import React, { useState } from 'react';
import { GripVertical, BedDouble, Tent, Ship, Car, Plane, Info, Pen, Trash2 } from 'lucide-react';
export default TripList;

// Figma-aligned TripList: modern card design, clear actions, responsive
function TripList({ tripItems = [], editingItem, handleEditClick, handleDeleteItem, handleMoveUp, handleMoveDown, handleInputChange, handleSaveEdit, loadingInitialData, handleReorder, handleToggleStatus }) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const sortedItems = (Array.isArray(tripItems) ? tripItems.slice().sort((a, b) => (a?.date || '').localeCompare(b?.date || '')) : []);

  if (sortedItems.length === 0 && !loadingInitialData) {
    return (
      <p className="text-center text-gray-400 text-lg py-8">No trip items yet for this trip. Add one above!</p>
    );
  }

  // Drag and Drop handlers (unchanged)
  const handleDragStart = (e, item, index) => {
    setDraggedItem({ item, index });
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedItem && draggedItem.index !== targetIndex) {
      if (handleReorder) handleReorder(draggedItem.index, targetIndex);
    }
    setDraggedItem(null);
  };
  const handleDragEnd = () => { setDraggedItem(null); setDragOverIndex(null); };

  // Card rendering with drag handle, icons, pill tags, and expand/collapse
  const getTransportIcon = (type, item) => {
  if (type === 'roofed') return <BedDouble className="inline w-5 h-5 text-indigo-400 mr-1" title="Title" />;
    if (type === 'camp') return <Tent className="inline w-5 h-5 text-green-500 mr-1" title="Camping" />;
    if (type === 'enroute') return <Car className="inline w-5 h-5 text-orange-400 mr-1" title="Enroute" />;
    if (type === 'note') return <Info className="inline w-5 h-5 text-gray-400 mr-1" title="Note" />;
  if (type === 'ferry' || (item && item.title?.toLowerCase().includes('spirit'))) return <Ship className="inline w-5 h-5 text-blue-400 mr-1" title="Ferry" />;
    if (type === 'car') return <Car className="inline w-5 h-5 text-gray-500 mr-1" title="Car" />;
    if (type === 'plane') return <Plane className="inline w-5 h-5 text-orange-400 mr-1" title="Flight" />;
    return null;
  };

  const renderActivities = (activities) => {
    if (!activities) return null;
    // Split by comma or semicolon, trim whitespace
    const tags = activities.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1 mb-1">
        {tags.map((tag, i) => (
          <span key={i} className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">{tag}</span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
  {sortedItems.map((item, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div
            key={item.id}
            className={`bg-white p-4 md:p-6 rounded-xl shadow-lg border-l-4 transition-all duration-200 flex items-start gap-3 ${dragOverIndex === index ? 'border-indigo-500 scale-[1.01]' : 'border-gray-200'} ${draggedItem?.index === index ? 'opacity-50 scale-95' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, item, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle */}
            <button
              className="flex-shrink-0 mr-2 mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-indigo-500"
              title="Drag to reorder"
              tabIndex={-1}
              style={{ outline: 'none', border: 'none', background: 'none' }}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              <GripVertical className="w-5 h-5" />
            </button>
            {/* Card content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">{item.date}</span>
                <span className="text-lg font-bold text-indigo-800">{item.location}</span>
                {item._pendingMerge && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Pending merge</span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <input 
                  type="checkbox" 
                  checked={item.status === 'Completed'} 
                  onChange={() => handleToggleStatus && handleToggleStatus(item.id)}
                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                  title="Mark as completed"
                  onClick={(e) => e.stopPropagation()}
                />
                {item.title && item.titleLink ? (
                  <a href={item.titleLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-sm">
                    {item.title}
                  </a>
                ) : (
                  <span className="text-sm text-gray-700">{item.title}</span>
                )}
                {item.status === 'Completed' && (
                  <span className="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded" title="Completed">✓</span>
                )}
              </div>
              {item.travelTime && (
                <div className="text-xs text-gray-500 mb-1 flex items-center"><Car className="w-4 h-4 mr-1 inline" />{item.travelTime}</div>
              )}
              {/* Activities as pill tags, clickable if link exists */}
              {item.activities && item.activityLink ? (
                <a href={item.activityLink} target="_blank" rel="noopener noreferrer" className="block">
                  {renderActivities(item.activities)}
                </a>
              ) : (
                renderActivities(item.activities)
              )}
              {/* Expand/collapse details */}
              <button
                className="text-xs text-indigo-500 underline focus:outline-none mb-1"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                {isExpanded ? 'Hide details' : 'Show details'}
              </button>
              {isExpanded && (
                <div className="mt-2 space-y-1">
                  {item.notes && (
                    <div className="text-xs text-gray-500"><span className="font-medium">Notes:</span> {item.notes}</div>
                  )}
                  {item.status && (
                    <div className="text-xs text-gray-500"><span className="font-medium">Status:</span> {item.status}</div>
                  )}
                  {item.photos && (() => {
                    const photoUrls = typeof item.photos === 'string' ? item.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
                    return photoUrls.length > 0 && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Photos:</span>
                        <div className="flex gap-2 flex-wrap mt-2">
                          {photoUrls.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`Trip photo ${idx + 1}`} className="w-20 h-20 object-cover rounded border border-gray-300 hover:opacity-80 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {item.activityLink && (
                    <div className="text-xs text-blue-600">
                      <a href={item.activityLink} target="_blank" rel="noopener noreferrer" className="underline">
                        {item.type === 'roofed' ? 'View hotel options' : item.type === 'camp' ? 'Find camping spots' : item.type === 'note' ? 'Things to do' : 'Activities'}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Actions: Type | Edit | Delete (vertical) */}
            <div className="flex flex-col gap-2 items-center ml-2">
              {/* Type icon (now includes enroute) */}
              {['roofed', 'camp', 'enroute', 'note', 'ferry', 'car'].includes(item.type) && (
                <span>{getTransportIcon(item.type, item)}</span>
              )}
              {handleEditClick && (
                <button type="button" onMouseDown={e => e.stopPropagation()} onClick={() => handleEditClick(item)} className="p-2 rounded hover:bg-indigo-100 text-indigo-600" title="Edit">
                  <Pen className="w-4 h-4" />
                </button>
              )}
              {handleDeleteItem && (
                <button type="button" onMouseDown={e => e.stopPropagation()} onClick={() => handleDeleteItem(item.id)} className="p-2 rounded hover:bg-red-100 text-red-600" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {handleMoveUp && (
                <button type="button" onMouseDown={e => e.stopPropagation()} onClick={() => handleMoveUp(item.id)} className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Move Up">
                  ▲
                </button>
              )}
              {handleMoveDown && (
                <button type="button" onMouseDown={e => e.stopPropagation()} onClick={() => handleMoveDown(item.id)} className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Move Down">
                  ▼
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

