import React from 'react';
import UserMenu from './UserMenu';

export default function AppHeader({ userEmail, userAvatar, onLogin, onLogout, onProfile, onChooseTrip }) {
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
        <UserMenu
          userEmail={userEmail}
          userAvatar={userAvatar}
          onLogin={onLogin}
          onLogout={onLogout}
          onProfile={onProfile}
          onChooseTrip={onChooseTrip}
        />
      </div>
    </header>
  );
}
