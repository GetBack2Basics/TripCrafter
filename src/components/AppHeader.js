import React, { useState, useRef, useEffect } from 'react';

import AIImportButton from './AIImportButton';
export default function AppHeader({
  onSettings, onHelp, userEmail, userAvatar, activeView, setActiveView,
  onAddStop, onAIImport, onPhotoUpload, onHelpClick,
  onProfileLogin, onProfileLogout, onProfileChangeTrip, onProfileAddTrip
}) {
  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Use handlers from props for dropdown actions
  const handleLogin = () => { if (onProfileLogin) onProfileLogin(); setShowDropdown(false); };
  const handleLogout = () => { if (onProfileLogout) onProfileLogout(); setShowDropdown(false); };
  const handleChangeTrip = () => { if (onProfileChangeTrip) onProfileChangeTrip(); setShowDropdown(false); };
  const handleAddTrip = () => { if (onProfileAddTrip) onProfileAddTrip(); setShowDropdown(false); setShowAddTripModal(true); };
  const handleCloseAddTripModal = () => setShowAddTripModal(false);

  return (
    <header className="w-full flex flex-col md:flex-row md:items-center justify-between px-6 py-4 bg-white shadow-sm border-b border-gray-200 gap-2">
      <div className="flex items-center gap-3 flex-shrink-0">
        <img src="/logo192.png" alt="Trip Crafter Logo" className="h-10 w-10 rounded-full shadow" />
        <span className="text-2xl font-bold text-indigo-700 tracking-tight">Trip Crafter</span>
      </div>
      {/* Responsive: view switcher and actions in a row, collapse to column on small screens */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 justify-center">
        <div className="flex flex-row flex-wrap gap-2 bg-gray-100 rounded-lg p-1 justify-center">
          <button
            className={`px-4 py-2 rounded-md font-semibold transition text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 ${activeView === 'discover' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-white/80'}`}
            onClick={() => setActiveView('discover')}
          >
            Discover
          </button>
          <button
            className={`px-4 py-2 rounded-md font-semibold transition text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 ${activeView === 'itinerary' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-white/80'}`}
            onClick={() => setActiveView('itinerary')}
          >
            Table
          </button>
          <button
            className={`px-4 py-2 rounded-md font-semibold transition text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 ${activeView === 'list' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-white/80'}`}
            onClick={() => setActiveView('list')}
          >
            Cards
          </button>
          <button
            className={`px-4 py-2 rounded-md font-semibold transition text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 ${activeView === 'map' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-white/80'}`}
            onClick={() => setActiveView('map')}
          >
            Map
          </button>
        </div>
        {/* Actions: Add Stop, AI Import, Help */}
        <div className="flex flex-row flex-wrap gap-2 justify-center">
          <button
            className="h-10 min-h-[2.5rem] px-4 flex items-center justify-center rounded-lg font-semibold text-sm shadow transition bg-blue-600 hover:bg-blue-700 text-white"
            style={{ fontFamily: 'inherit', lineHeight: 1.2 }}
            onClick={onAddStop}
          >
            + Add Stop
          </button>
          <button
            className="h-10 min-h-[2.5rem] px-4 flex items-center justify-center rounded-lg font-semibold text-sm shadow transition bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            style={{ fontFamily: 'inherit', lineHeight: 1.2 }}
            onClick={onAIImport}
            title="Import trip data from URLs, PDFs, or text using AI"
          >
            <span className="text-xl mr-2">🤖</span>
            <span>AI Import</span>
          </button>
          <button
            className="h-10 min-h-[2.5rem] px-4 flex items-center justify-center rounded-lg font-semibold text-sm shadow transition bg-green-600 hover:bg-green-700 text-white"
            style={{ fontFamily: 'inherit', lineHeight: 1.2 }}
            onClick={onPhotoUpload}
            title="Upload photos with GPS data to create trip items"
          >
            <span className="text-xl mr-2">📸</span>
            <span>Photos</span>
          </button>
          <button
            className="h-10 min-h-[2.5rem] px-4 flex items-center justify-center rounded-lg font-semibold text-sm shadow transition bg-gray-200 hover:bg-gray-300 text-indigo-700"
            style={{ fontFamily: 'inherit', lineHeight: 1.2 }}
            onClick={onHelpClick}
          >
            Help
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 relative" ref={dropdownRef}>
        {userEmail && (
          <span className="text-sm text-gray-500 font-medium mr-2">{userEmail}</span>
        )}
        <button
          className="focus:outline-none"
          aria-label="Profile menu"
          onClick={() => setShowDropdown((v) => !v)}
        >
          {userAvatar ? (
            <img src={userAvatar} alt="Profile" className="h-9 w-9 rounded-full border-2 border-indigo-200 shadow" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shadow">
              <span>{userEmail ? userEmail[0].toUpperCase() : 'U'}</span>
            </div>
          )}
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-12 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] py-2 flex flex-col animate-fade-in">
            {userEmail ? (
              <>
                <button className="px-4 py-2 text-left hover:bg-gray-100 w-full" onClick={handleChangeTrip}>Change Trip</button>
                <button className="px-4 py-2 text-left hover:bg-gray-100 w-full" onClick={handleAddTrip}>Add New Trip</button>
                <button className="px-4 py-2 text-left hover:bg-gray-100 w-full" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <button className="px-4 py-2 text-left hover:bg-gray-100 w-full" onClick={handleLogin}>Login</button>
            )}
          </div>
        )}
        {/* Modal for Add Trip */}
        {showAddTripModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={handleCloseAddTripModal}>&times;</button>
              <h2 className="text-xl font-bold mb-4">Add New Trip</h2>
              <div className="text-gray-500 mb-4">(Trip creation form goes here)</div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={handleCloseAddTripModal}>Close</button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
