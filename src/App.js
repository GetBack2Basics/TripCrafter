/* global __app_id, __firebase_config, __initial_auth_token */
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
// eslint-disable-next-line no-unused-vars
import { getFirestore, doc, setDoc, collection, query, onSnapshot, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import defaultTasmaniaTripData from './Trip-Default_Tasmania2025'; // Import the default trip data

function App() {
  const [tripItems, setTripItems] = useState([]);
  const [db, setDb] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalConfirmAction, setModalConfirmAction] = useState(null);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [version, setVersion] = useState('1.0.0');

  // New states for authentication UI
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Initialize Firebase and set up authentication listener
  useEffect(() => {
    // eslint-disable-next-line no-undef, no-unused-vars
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    // eslint-disable-next-line no-undef
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

    if (Object.keys(firebaseConfig).length > 0) {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      setDb(firestore);
      const firebaseAuth = getAuth(app);
      setAuth(firebaseAuth);

      const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          setUserEmail(user.email);
          setIsAuthReady(true);
        } else {
          try {
            // eslint-disable-next-line no-undef
            if (typeof __initial_auth_token !== 'undefined') {
              // eslint-disable-next-line no-undef
              await signInWithCustomToken(firebaseAuth, __initial_auth_token);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (error) {
            console.error("Error during anonymous sign-in:", error);
            setUserId(crypto.randomUUID());
          } finally {
            setIsAuthReady(true);
          }
        }
      });

      return () => unsubscribeAuth();
    } else {
      console.log("Firebase config not available, running without database persistence.");
      setTripItems(defaultTasmaniaTripData.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setLoadingInitialData(false);
      setIsAuthReady(true);
    }
  }, []);

  useEffect(() => {
    const initializeTrip = async () => {
      if (!db || !userId || !isAuthReady) return;

      setLoadingInitialData(true);
      // eslint-disable-next-line no-undef
      const tripsCollectionRef = collection(db, `artifacts/${__app_id}/public/data/trips`);
      const q = query(tripsCollectionRef);

      const tripsSnapshot = await getDocs(q);

      let selectedTripId;

      if (tripsSnapshot.empty) {
        console.log("No trips found. Creating default 'Tasmania 2025' trip.");
        const newTripRef = doc(tripsCollectionRef);
        selectedTripId = newTripRef.id;

        await setDoc(newTripRef, {
          name: 'Tasmania 2025',
          startDate: '2025-12-22',
          endDate: '2026-01-13',
          ownerId: userId,
          createdAt: new Date(),
        });

        const itineraryCollectionRef = collection(newTripRef, 'itineraryItems');
        for (const item of defaultTasmaniaTripData) {
          await setDoc(doc(itineraryCollectionRef, item.id), item);
        }
      } else {
        selectedTripId = tripsSnapshot.docs[0].id;
        console.log(`Existing trip found. Selecting trip ID: ${selectedTripId}`);
      }
      setCurrentTripId(selectedTripId);
      setLoadingInitialData(false);
    };

    if (db && userId && isAuthReady && !currentTripId) {
      initializeTrip();
    }
  }, [db, userId, isAuthReady, currentTripId]);

  useEffect(() => {
    if (db && currentTripId) {
      // eslint-disable-next-line no-undef
      const itineraryRef = collection(db, `artifacts/${__app_id}/public/data/trips/${currentTripId}/itineraryItems`);
      const q = query(itineraryRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setTripItems(items.sort((a, b) => new Date(a.date) - new Date(b.date)));
      }, (error) => {
        console.error("Error fetching trip itinerary: ", error);
      });

      return () => unsubscribe();
    }
  }, [db, currentTripId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingItem) {
      setEditingItem({ ...editingItem, [name]: value });
    } else {
      setNewItem({ ...newItem, [name]: value });
    }
  };

  const openModal = (message, confirmAction = null) => {
    setModalMessage(message);
    setModalConfirmAction(() => confirmAction);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalMessage('');
    setModalConfirmAction(null);
  };

  const handleConfirmAction = () => {
    if (modalConfirmAction) {
      modalConfirmAction();
    }
    closeModal();
  };

  // --- Authentication Handlers ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!auth) {
      console.error("Firebase Auth object not initialized.");
      setAuthError("Authentication service not available.");
      return;
    }

    console.log("Attempting authentication...");
    console.log("Mode:", isLoginMode ? "Login" : "Sign Up");
    console.log("Email:", email);
    console.log("Password:", password ? "********" : "[empty]"); // Mask password in console

    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
      setAuthError('');
      console.log("Authentication successful!");
    } catch (error) {
      console.error("Auth error caught:", error);
      setAuthError(error.message); // Display Firebase error message to user
      console.log("Firebase error code:", error.code); // Log Firebase specific error code
    }
  };

  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        setUserId(null);
        setUserEmail(null);
        setCurrentTripId(null);
        setTripItems([]);
        setLoadingInitialData(true);
        console.log("User logged out successfully.");
      } catch (error) {
        console.error("Error logging out:", error);
        setAuthError(error.message);
      }
    }
  };
  // --- End Authentication Handlers ---

  const handleAddItem = async () => {
    if (!newItem.date || !newItem.location || !newItem.accommodation) {
      openModal('Please fill in all required fields (Date, Location, Accommodation).');
      return;
    }
    if (!currentTripId) {
      openModal('No trip selected. Please select or create a trip first.');
      return;
    }

    // eslint-disable-next-line no-undef
    const itineraryCollectionRef = collection(db, `artifacts/${__app_id}/public/data/trips/${currentTripId}/itineraryItems`);
    const newItemRef = doc(itineraryCollectionRef);
    const itemToAdd = { ...newItem, id: newItemRef.id };

    try {
      await setDoc(newItemRef, itemToAdd);
      setNewItem({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '' });
      openModal('Trip item added successfully!');
    } catch (error) {
      console.error("Error adding document: ", error);
      openModal('Error adding trip item. Please try again.');
    }
  };

  const handleEditClick = (item) => {
    setEditingItem({ ...item });
  };

  const handleSaveEdit = async () => {
    if (!editingItem.date || !editingItem.location || !editingItem.accommodation) {
      openModal('Please fill in all required fields (Date, Location, Accommodation).');
      return;
    }
    if (!currentTripId) {
      openModal('No trip selected. Cannot save edits without a selected trip.');
      return;
    }

    try {
      // eslint-disable-next-line no-undef
      const docRef = doc(db, `artifacts/${__app_id}/public/data/trips/${currentTripId}/itineraryItems`, editingItem.id);
      await updateDoc(docRef, editingItem);
      setEditingItem(null);
      openModal('Trip item updated successfully!');
    } catch (error) {
      console.error("Error updating document: ", error);
      openModal('Error updating trip item. Please try again.');
    }
  };

  const handleDeleteItem = (id) => {
    openModal('Are you sure you want to delete this trip item?', async () => {
      if (!currentTripId) {
        openModal('No trip selected. Cannot delete item.');
        return;
      }
      try {
        // eslint-disable-next-line no-undef
        const docRef = doc(db, `artifacts/${__app_id}/public/data/trips/${currentTripId}/itineraryItems`, id);
        await deleteDoc(docRef);
        openModal('Trip item deleted successfully!');
      } catch (error) {
        console.error("Error deleting document: ", error);
        openModal('Error deleting trip item. Please try again.');
      }
    });
  };

  // Display loading screen until Firebase Auth is ready and initial trip is set
  if (!isAuthReady || loadingInitialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
        <div className="text-indigo-700 text-2xl font-semibold">Loading Trip Crafter...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4 font-inter text-gray-800 flex justify-center items-center">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl p-6 relative">
        <h1 className="text-4xl font-bold text-center text-indigo-700 mb-8 tracking-wide">
          Trip Crafter
        </h1>

        {/* Auth status and buttons */}
        <div className="text-center text-sm text-gray-600 mb-6">
          {userEmail ? (
            <>
              Logged in as: <span className="font-mono bg-gray-100 px-2 py-1 rounded-md">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="ml-4 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full shadow-md transition duration-300 transform hover:scale-105"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              You are currently anonymous.
              <button
                onClick={() => setShowAuthModal(true)}
                className="ml-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded-full shadow-md transition duration-300 transform hover:scale-105"
              >
                Login / Sign Up
              </button>
            </>
          )}
          <br />
          {userId && (
            <span className="text-sm text-gray-600">Your User ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded-md">{userId}</span></span>
          )}
          {currentTripId && (
            <span className="text-sm text-gray-600 ml-2">Current Trip ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded-md">{currentTripId}</span></span>
          )}
        </div>

        {/* Authentication Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
              <h2 className="text-2xl font-semibold text-indigo-600 mb-4 text-center">
                {isLoginMode ? 'Login' : 'Sign Up'}
              </h2>
              <form onSubmit={handleAuthSubmit}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                />
                {authError && <p className="text-red-500 text-sm mb-4">{authError}</p>}
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {isLoginMode ? 'Login' : 'Sign Up'}
                </button>
              </form>
              <button
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="w-full text-indigo-600 mt-4 text-sm hover:underline"
              >
                {isLoginMode ? 'Need an account? Sign Up' : 'Already have an account? Login'}
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full text-gray-500 mt-2 text-sm hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Standard Modal for messages and confirmations */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
              <p className="text-lg text-center mb-6">{modalMessage}</p>
              <div className="flex justify-around">
                {modalConfirmAction ? (
                  <>
                    <button
                      onClick={handleConfirmAction}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 transform hover:scale-105"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={closeModal}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full shadow-md transition duration-300 transform hover:scale-105"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={closeModal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-full shadow-md transition duration-300 transform hover:scale-105"
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add New Item Form */}
        <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-inner">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-4">Add New Trip Item</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="date"
              name="date"
              value={newItem.date}
              onChange={handleInputChange}
              placeholder="Date"
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="text"
              name="location"
              value={newItem.location}
              onChange={handleInputChange}
              placeholder="Location"
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="text"
              name="accommodation"
              value={newItem.accommodation}
              onChange={handleInputChange}
              placeholder="Accommodation"
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              name="status"
              value={newItem.status}
              onChange={handleInputChange}
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="Unconfirmed">Unconfirmed</option>
              <option value="Booked">Booked</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <input
              type="text"
              name="travelTime"
              value={newItem.travelTime}
              onChange={handleInputChange}
              placeholder="Est. Travel Time (e.g., 2h 30m)"
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="text"
              name="activities"
              value={newItem.activities}
              onChange={handleInputChange}
              placeholder="Activities for the day"
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <textarea
              name="notes"
              value={newItem.notes}
              onChange={handleInputChange}
              placeholder="Notes (e.g., guest details)"
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 col-span-1 md:col-span-2 lg:col-span-3"
              rows="2"
            ></textarea>
          </div>
          <button
            onClick={handleAddItem}
            className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            Add Trip Item
          </button>
        </div>

        {/* Trip Items List */}
        <h2 className="text-3xl font-bold text-center text-indigo-700 mb-6">Your Trip Itinerary</h2>
        {tripItems.length === 0 && !loadingInitialData ? (
          <p className="text-center text-gray-500 text-xl py-8">No trip items yet for this trip. Add one above!</p>
        ) : (
          <div className="space-y-6">
            {tripItems.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-lg shadow-md border-t-4 border-indigo-500">
                {editingItem && editingItem.id === item.id ? (
                  /* Edit Form */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="date"
                      name="date"
                      value={editingItem.date}
                      onChange={handleInputChange}
                      className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      type="text"
                      name="location"
                      value={editingItem.location}
                      onChange={handleInputChange}
                      placeholder="Location"
                      className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      type="text"
                      name="accommodation"
                      value={editingItem.accommodation}
                      onChange={handleInputChange}
                      placeholder="Accommodation"
                      className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <select
                      name="status"
                      value={editingItem.status}
                      onChange={handleInputChange}
                      className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="Unconfirmed">Unconfirmed</option>
                      <option value="Booked">Booked</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <input
                      type="text"
                      name="travelTime"
                      value={editingItem.travelTime}
                      onChange={handleInputChange}
                      placeholder="Est. Travel Time"
                      className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      type="text"
                      name="activities"
                      value={editingItem.activities}
                      onChange={handleInputChange}
                      placeholder="Activities for the day"
                      className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <textarea
                      name="notes"
                      value={editingItem.notes}
                      onChange={handleInputChange}
                      placeholder="Notes"
                      className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 col-span-full"
                      rows="2"
                    ></textarea>
                    <div className="flex justify-end space-x-2 mt-4 col-span-full">
                      <button
                        onClick={handleSaveEdit}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingItem(null)}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full shadow-md transition duration-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Item */
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-gray-500">{item.date}</p>
                        <h3 className="text-xl font-semibold text-indigo-800 mb-1">{item.location}</h3>
                        <p className="text-lg text-gray-700">{item.accommodation}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          item.status === 'Booked' ? 'bg-green-100 text-green-800' :
                          item.status === 'Unconfirmed' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    {item.travelTime && (
                      <p className="text-md text-gray-600 mb-2">
                        <span className="font-medium">Est. Travel Time:</span> {item.travelTime}
                      </p>
                    )}
                    {item.activities && (
                      <p className="text-md text-gray-600 mb-2">
                        <span className="font-medium">Activities:</span> {item.activities}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-md text-gray-600 mb-4">{item.notes}</p>
                    )}
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 transform hover:scale-105"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 transform hover:scale-105"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Version number display */}
        <div className="text-center text-xs text-gray-400 mt-8">
          Version: {version}
        </div>
      </div>
    </div>
  );
}

export default App;
