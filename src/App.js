
import React from 'react';
import AppHeader from './components/AppHeader';
import MainLayout from './components/MainLayout';
import TripDashboard from './components/TripDashboard';

function App() {
  return (
    <div className="font-inter text-gray-800">
      <AppHeader />
      <MainLayout>
        <TripDashboard />
      </MainLayout>
    </div>
  );
}

export default App;
