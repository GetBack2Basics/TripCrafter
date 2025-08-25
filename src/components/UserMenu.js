import React, { useState, useRef, useEffect } from 'react';

export default function UserMenu({ userEmail, userAvatar, onLogin, onLogout, onProfile, onChooseTrip }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shadow focus:outline-none border-2 border-indigo-200"
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
      >
        {userAvatar ? (
          <img src={userAvatar} alt="Profile" className="h-9 w-9 rounded-full" />
        ) : (
          <span>{userEmail ? userEmail[0].toUpperCase() : 'U'}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <button className="block w-full text-left px-4 py-2 hover:bg-gray-50" onClick={onProfile}>Profile</button>
          <button className="block w-full text-left px-4 py-2 hover:bg-gray-50" onClick={onChooseTrip}>Choose/Add Trip</button>
          {userEmail ? (
            <button className="block w-full text-left px-4 py-2 hover:bg-gray-50" onClick={onLogout}>Logout</button>
          ) : (
            <button className="block w-full text-left px-4 py-2 hover:bg-gray-50" onClick={onLogin}>Login</button>
          )}
        </div>
      )}
    </div>
  );
}
