
import React, { useState } from 'react';
import defaultTasmaniaTripDataRaw from '../Trip-Default_Tasmania2025';
import TripList from '../TripList';
import TripMap from '../TripMap';
import TripDiscover from '../TripDiscover';
import TripTable from '../TripTable';
import BottomNav from './BottomNav';
import AIImportModal from './AIImportModal';
import TripHelpModal from './TripHelpModal';
import TripForm from '../TripForm';
import AppHeader from './AppHeader';
import LoginModal from './LoginModal';
import TripSelectModal from './TripSelectModal';
import TripCreateModal from './TripCreateModal';


export default function TripDashboard() {
  // Minimal state for UI skeleton
  const [activeView, setActiveView] = useState('discover');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAIImportModal, setShowAIImportModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Use normalized default trip data for demo (not-logged-in) users
  // Helper to create a slug for image filenames
  function locationSlug(location) {
    if (!location) return 'default';
    return location
      .replace(/,?\s*tas(\s*\d{4})?/i, '')
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/_+/g, '_')
      .replace(/,/g, '__')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  function discoverImagesForLocation(location) {
    const slug = locationSlug(location);
    // Assume images are in public/discover-images/ and named as slug_1.jpg, slug_2.jpg, slug_3.jpg
    return [1, 2, 3].map(i => `/discover-images/${slug}_${i}.jpg`);
  }

  function normalizeTripItem(item) {
    // Ensure all required fields exist and are named consistently
    return {
      id: item.id || Math.random().toString(36).substr(2, 9),
      date: item.date || '',
      location: item.location || '',
      title: item.title || item.activities || '',
      status: item.status || 'Unconfirmed',
      notes: item.notes || '',
      travelTime: item.travelTime || '',
      activities: item.activities || '',
      type: item.type || 'roofed',
      activityLink: item.activityLink || '',
      discoverImages: discoverImagesForLocation(item.location),
    };
  }
  const [tripItems, setTripItems] = useState(defaultTasmaniaTripDataRaw.map(normalizeTripItem));
  const [newItem, setNewItem] = useState({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
  const [editingItem, setEditingItem] = useState(null);

  // Demo trip editing logic (add, edit, delete)
  const handleAddItem = () => {
    const itemWithId = { ...newItem, id: Math.random().toString(36).substr(2, 9) };
    setTripItems([...tripItems, itemWithId]);
    setShowAddForm(false);
    setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
  };
  const handleEditClick = (item) => {
    setEditingItem(item);
    setNewItem(item);
    setShowAddForm(true);
  };
  const handleSaveEdit = () => {
    setTripItems(tripItems.map(item => item.id === editingItem.id ? newItem : item));
    setShowAddForm(false);
    setEditingItem(null);
    setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
  };
  const handleDeleteItem = (id) => {
    setTripItems(tripItems.filter(item => item.id !== id));
  };

  return (
    <div className="flex flex-col min-h-[60vh]">
      <AppHeader
        userEmail={null}
        userAvatar={null}
        activeView={activeView}
        setActiveView={setActiveView}
        onAddStop={() => setShowAddForm(true)}
        onAIImport={() => setShowAIImportModal(true)}
        onHelpClick={() => setShowHelp(true)}
      />
      {/* Profile Modals (stubbed closed) */}
      <LoginModal isOpen={false} onClose={() => {}} onLoginSuccess={() => {}} />
      <TripSelectModal isOpen={false} onClose={() => {}} userId={null} onTripSelect={() => {}} />
      <TripCreateModal isOpen={false} onClose={() => {}} userId={null} onTripCreated={() => {}} />
      {/* Summary/Header Area + Tabbed View Switcher */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-indigo-700 tracking-tight">Trip Itinerary</h2>
          <div className="text-gray-500 text-sm mt-1">Plan, organize, and visualize your trip</div>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1">
  {activeView === 'itinerary' && <TripTable tripItems={tripItems} handleEditClick={handleEditClick} handleDeleteItem={handleDeleteItem} />}
  {activeView === 'list' && <TripList tripItems={tripItems} handleEditClick={handleEditClick} handleDeleteItem={handleDeleteItem} />}
  {activeView === 'map' && <TripMap tripItems={tripItems} />}
  {activeView === 'discover' && <TripDiscover tripItems={tripItems} handleEditClick={handleEditClick} handleDeleteItem={handleDeleteItem} />}
      </div>
      {/* Bottom Navigation for mobile */}
      <div className="md:hidden mt-4">
        <BottomNav activeView={activeView} setActiveView={setActiveView} />
      </div>
      {/* Modals (stubbed) */}
      <AIImportModal isOpen={showAIImportModal} onClose={() => setShowAIImportModal(false)} onImportSuccess={() => setShowAIImportModal(false)} onError={msg => alert(msg)} />
      <TripHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      {/* Add/Edit Trip Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-0 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10"
              onClick={() => {
                setShowAddForm(false);
                setEditingItem(null);
                setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
              }}
              aria-label="Close"
            >
              ×
            </button>
            <TripForm
              newItem={newItem}
              handleInputChange={e => setNewItem(prev => ({ ...prev, [e.target.name]: e.target.value }))}
              onAddItem={handleAddItem}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => {
                setShowAddForm(false);
                setEditingItem(null);
                setNewItem({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
              }}
              openModal={msg => alert(msg)}
              isEditing={!!editingItem}
            />
          </div>
        </div>
      )}
    </div>
  );
}
