import React from 'react';
import { Calendar, Map } from 'lucide-react';

// Simple Button component for demonstration. Replace with your UI library if needed.
function Button({ variant, className, onClick, children }) {
  const base = 'px-4 py-2 rounded flex items-center justify-center transition-colors';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    ghost: 'bg-transparent text-blue-600 hover:bg-blue-100',
  };
  return (
    <button
      className={`${base} ${variants[variant] || ''} ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function BottomNav({ activeView, setActiveView }) {
  return (
    <nav className="border-t border-gray-200 bg-white p-4">
      <div className="flex gap-2">
        <Button
          variant={activeView === 'itinerary' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setActiveView('itinerary')}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Itinerary
        </Button>
        <Button
          variant={activeView === 'map' ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => setActiveView('map')}
        >
          <Map className="w-4 h-4 mr-2" />
          Map View
        </Button>
      </div>
    </nav>
  );
}
