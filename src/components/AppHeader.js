import React from 'react';

export default function AppHeader({ onSettings, onHelp, userEmail, userAvatar }) {
  return (
    <header className="w-full flex items-center justify-between px-6 py-4 bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center gap-3">
        <img src="/logo192.png" alt="Trip Crafter Logo" className="h-10 w-10 rounded-full shadow" />
        <span className="text-2xl font-bold text-indigo-700 tracking-tight">Trip Crafter</span>
      </div>
      <div className="flex items-center gap-2">
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
