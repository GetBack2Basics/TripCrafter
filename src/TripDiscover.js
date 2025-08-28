import React from 'react';
import { BedDouble, Tent, Car, Info, Ship, Pen, Trash2 } from 'lucide-react';

function getTypeIcon(type, item) {
  if (type === 'roofed') return <BedDouble className="inline w-5 h-5 text-indigo-400" title="Title" />;
  if (type === 'camp') return <Tent className="inline w-5 h-5 text-green-500" title="Camping" />;
  if (type === 'enroute') return <Car className="inline w-5 h-5 text-orange-400" title="Enroute" />;
  if (type === 'note') return <Info className="inline w-5 h-5 text-gray-400" title="Note" />;
  if (type === 'ferry' || (item && item.title?.toLowerCase().includes('spirit'))) return <Ship className="inline w-5 h-5 text-blue-400" title="Ferry" />;
  if (type === 'car') return <Car className="inline w-5 h-5 text-gray-500" title="Car" />;
  return null;
}


// Use the same slug logic as TripDashboard.js
function locationSlug(location) {
  if (!location) return 'default';
  return location
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/,/g, '__')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function getLocalDiscoverImages(location) {
  const slug = locationSlug(location);
  // Always return Unsplash dynamic source images (no local download required)
  const q = encodeURIComponent((location || 'travel').split(',')[0]);
  return [1, 2, 3].map(i => `https://source.unsplash.com/800x600/?${q}&sig=${i}`);
}

export default function TripDiscover({ tripItems = [], handleEditClick, handleDeleteItem }) {
  if (!tripItems.length) {
    return <p className="text-center text-gray-400 text-lg py-8">No discover items available.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {tripItems.map((item) => {
        const images = getLocalDiscoverImages(item.location);
  const imgUrl = images[0] || '/logo512.png';
  console.log('Discover image URL:', imgUrl, 'for location:', item.location);
        return (
          <div key={item.id} className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col hover:shadow-2xl transition-shadow duration-200">
            <div className="overflow-hidden rounded-t-xl">
              <img
                src={imgUrl}
                alt={item.location}
                className="h-40 w-full object-cover border-b border-gray-200 transition-transform duration-200 hover:scale-105"
                style={{ background: '#f8fafc' }}
              />
            </div>
            <div className="p-3 flex-1 flex flex-col">
              <div className="font-bold text-indigo-700 text-sm mb-1 flex items-center gap-2">
                {getTypeIcon(item.type, item)}
                {item.location}
              </div>
              <div className="text-xs text-gray-500 flex-1">{item.title || item.activities || ''}</div>
              <div className="flex gap-2 mt-2">
                <button
                  className="h-10 min-h-[2.5rem] px-4 flex items-center justify-center rounded-lg font-semibold text-sm shadow transition bg-blue-600 hover:bg-blue-700 text-white"
                  style={{ fontFamily: 'inherit', lineHeight: 1.2 }}
                  onClick={() => handleEditClick && handleEditClick(item)}
                  title="Edit"
                >
                  <Pen className="w-4 h-4 mr-2" />Edit
                </button>
                <button
                  className="h-10 min-h-[2.5rem] px-4 flex items-center justify-center rounded-lg font-semibold text-sm shadow transition bg-red-100 hover:bg-red-200 text-red-600"
                  style={{ fontFamily: 'inherit', lineHeight: 1.2 }}
                  onClick={() => handleDeleteItem && handleDeleteItem(item.id)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 mr-2" />Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
