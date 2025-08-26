import TripList from '../TripList';
import TripMap from '../TripMap';
import TripDiscover from '../TripDiscover';
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
  const [activeView, setActiveView] = useState('itinerary');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAIImportModal, setShowAIImportModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Use local test data for local development
  const [tripItems, setTripItems] = useState([
    { id: '1', date: '2025-12-22', location: 'Hobart', title: 'Arrive in Hobart', status: 'Confirmed', notes: '', travelTime: '', activities: 'Explore city', type: 'roofed', activityLink: '' },
    { id: '2', date: '2025-12-23', location: 'Freycinet', title: 'Freycinet National Park', status: 'Planned', notes: '', travelTime: '', activities: 'Hiking', type: 'camp', activityLink: '' }
  ]);
  const [newItem, setNewItem] = useState({ date: '', location: '', title: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
  const [editingItem, setEditingItem] = useState(null);
  // ...add more state as needed for full restore

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
        {activeView === 'itinerary' && <TripTable tripItems={tripItems} handleEditClick={() => {}} handleDeleteItem={() => {}} />}
        {activeView === 'list' && <TripList tripItems={tripItems} handleEditClick={() => {}} handleDeleteItem={() => {}} />}
        {activeView === 'map' && <TripMap tripItems={tripItems} />}
        {activeView === 'discover' && <TripDiscover tripItems={tripItems} handleEditClick={() => {}} handleDeleteItem={() => {}} />}
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
              onAddItem={() => {}}
              onSaveEdit={() => {}}
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
