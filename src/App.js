
import React, { useState } from 'react';
import '../src/firebase';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import AppHeader from './components/AppHeader';
import MainLayout from './components/MainLayout';
import TripDashboard from './components/TripDashboard';
import TripChooser from './TripChooser';


// LoginModal component (top-level)
function LoginModal({ onClose }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            className="w-full border p-2 rounded"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full border p-2 rounded"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}


// Only one App function should exist
function App() {
  // App-level state for user info
  const [userEmail, setUserEmail] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTripChooser, setShowTripChooser] = useState(false);
  // Placeholder trip data for demo
  const [trips] = useState([
    { id: '1', name: 'Tasmania 2025', state: 'Tasmania', country: 'Australia', createdAt: Date.now() },
    { id: '2', name: 'NZ Adventure', state: 'Otago', country: 'New Zealand', createdAt: Date.now() }
  ]);
  const [currentTripId, setCurrentTripId] = useState('1');

  // Firebase Auth state sync
  React.useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email || null);
        setUserAvatar(user.photoURL || null);
      } else {
        setUserEmail(null);
        setUserAvatar(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handlers for user menu
  const handleLogin = () => setShowLogin(true);
  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    setUserEmail(null);
    setUserAvatar(null);
  };
  const handleProfile = () => setShowProfile(true);
  const handleChooseTrip = () => setShowTripChooser(true);

  return (
    <div className="font-inter text-gray-800">
      <AppHeader
        userEmail={userEmail}
        userAvatar={userAvatar}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onProfile={handleProfile}
        onChooseTrip={handleChooseTrip}
      />
      <MainLayout>
        <TripDashboard setUserEmail={setUserEmail} setUserAvatar={setUserAvatar} />
      </MainLayout>
      {/* Login Modal */}
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}
      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10" onClick={() => setShowProfile(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4">Profile</h2>
            <div>Email: {userEmail || 'Not logged in'}</div>
            {/* TODO: Add more profile info and edit options */}
          </div>
        </div>
      )}
      {/* Trip Chooser Modal */}
      {showTripChooser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10" onClick={() => setShowTripChooser(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4">Choose or Add Trip</h2>
            <TripChooser
              trips={trips}
              currentTripId={currentTripId}
              onSelectTrip={id => { setCurrentTripId(id); setShowTripChooser(false); }}
              onCreateNewTrip={() => { /* TODO: Add create trip logic */ setShowTripChooser(false); }}
            />
          </div>
        </div>
      )}

    </div>
  );

}
export default App;
