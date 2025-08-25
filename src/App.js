
import React from 'react';
import AppHeader from './components/AppHeader';
import MainLayout from './components/MainLayout';
import TripDashboard from './components/TripDashboard';


import { useState } from 'react';
function App() {
  // App-level state for user info
  const [userEmail, setUserEmail] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  return (
    <div className="font-inter text-gray-800">
      <AppHeader userEmail={userEmail} userAvatar={userAvatar} />
      <MainLayout>
        <TripDashboard setUserEmail={setUserEmail} setUserAvatar={setUserAvatar} />
      </MainLayout>
    </div>
  );
}

export default App;
