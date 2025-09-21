
import React from 'react';
import AppHeader from './components/AppHeader';
import MainLayout from './components/MainLayout';
import TripDashboard from './components/TripDashboard';


import { useState } from 'react';
function App() {
  return (
    <div className="font-inter text-gray-800 w-full min-w-full max-w-full overflow-x-hidden">
      <MainLayout>
        <TripDashboard />
      </MainLayout>
    </div>
  );
}

export default App;
