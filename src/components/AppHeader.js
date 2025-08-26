import React from 'react';

import AIImportButton from './AIImportButton';
export default function AppHeader({
  onSettings, onHelp, userEmail, userAvatar, activeView, setActiveView,
  onAddStop, onAIImport, onHelpClick
}) {
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
            className={`px-3 py-1 rounded-md font-medium transition text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${activeView === 'itinerary' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-white/80'}`}
            onClick={() => setActiveView('itinerary')}
          >
            Table
          </button>
          <button
            className={`px-3 py-1 rounded-md font-medium transition text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${activeView === 'list' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-white/80'}`}
            onClick={() => setActiveView('list')}
          >
            Cards
          </button>
          <button
            className={`px-3 py-1 rounded-md font-medium transition text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${activeView === 'map' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-white/80'}`}
            onClick={() => setActiveView('map')}
          >
            Map
          </button>
          <button
            className={`px-3 py-1 rounded-md font-medium transition text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${activeView === 'discover' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-white/80'}`}
            onClick={() => setActiveView('discover')}
          >
            Discover
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
            className="h-10 min-h-[2.5rem] px-4 flex items-center justify-center rounded-lg font-semibold text-sm shadow transition bg-gray-200 hover:bg-gray-300 text-indigo-700"
            style={{ fontFamily: 'inherit', lineHeight: 1.2 }}
            onClick={onHelpClick}
          >
            Help
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {userEmail && (
          <span className="text-sm text-gray-500 font-medium mr-2">{userEmail}</span>
        )}
        {userAvatar ? (
          <img src={userAvatar} alt="Profile" className="h-9 w-9 rounded-full border-2 border-indigo-200 shadow" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shadow">
            <span>{userEmail ? userEmail[0].toUpperCase() : 'U'}</span>
          </div>
        )}
      </div>
    </header>
  );
}
