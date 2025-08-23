/* global __app_id, __firebase_config, __initial_auth_token */
import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
// eslint-disable-next-line no-unused-vars
import { getFirestore, doc, setDoc, collection, query, onSnapshot, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import defaultTasmaniaTripData from './Trip-Default_Tasmania2025'; // Import the default trip data
import TripForm from './TripForm'; // Import the new TripForm component
import TripList from './TripList'; // Import the new TripList component
import TripTable from './TripTable'; // Import the new TripTable component
import TripMap from './TripMap'; // Import the new TripMap component

function App() {
  const [tripItems, setTripItems] = useState([]);
  const [db, setDb] = useState(null);
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
  const [appIdentifier, setAppIdentifier] = useState('default-app-id');
  const [viewMode, setViewMode] = useState('table'); // Default to 'table' view

  // New states for authentication UI
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Initialize Firebase and set up authentication listener
  useEffect(() => {
    let firebaseConfig = {};
    let tempAppIdentifier = 'default-app-id';

    // Check for Canvas environment variables first
    // eslint-disable-next-line no-undef
    if (typeof __firebase_config !== 'undefined' && typeof __app_id !== 'undefined') {
      try {
        // eslint-disable-next-line no-undef
        firebaseConfig = JSON.parse(__firebase_config);
        // eslint-disable-next-line no-undef
        tempAppIdentifier = __app_id;
        console.log("Using Canvas-provided Firebase config.");
      } catch (e) {
        console.error("Error parsing Canvas __firebase_config:", e);
      }
    } else {
      console.log("Using Netlify/production environment variables for Firebase config.");
      firebaseConfig = {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
        measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
      };
      tempAppIdentifier = process.env.REACT_APP_FIREBASE_PROJECT_ID || 'netlify-app-id';
    }

    setAppIdentifier(tempAppIdentifier);

    if (Object.keys(firebaseConfig).length > 0 && firebaseConfig.apiKey && firebaseConfig.projectId) {
      console.log("Firebase config found. Initializing app...");
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      setDb(firestore);
      const firebaseAuth = getAuth(app);
      setAuth(firebaseAuth);

      console.log("Setting up onAuthStateChanged listener...");
      const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          console.log("onAuthStateChanged: User is signed in.", user.uid);
          setUserId(user.uid);
          setUserEmail(user.email);
        } else {
          console.log("onAuthStateChanged: No user signed in. Attempting anonymous sign-in...");
          try {
            await new Promise(resolve => setTimeout(resolve, 100));
            // eslint-disable-next-line no-undef
            if (typeof __initial_auth_token !== 'undefined') {
              // eslint-disable-next-line no-undef
              await signInWithCustomToken(firebaseAuth, __initial_auth_token);
              console.log("Signed in with custom token.");
            } else {
              await signInAnonymously(firebaseAuth);
              console.log("Signed in anonymously.");
            }
          } catch (error) {
            console.error("Error during anonymous sign-in:", error);
            setUserId(crypto.randomUUID());
          }
        }
        console.log("Auth initialization complete. Setting isAuthReady to true.");
        setIsAuthReady(true);
      });

      return () => {
        console.log("Cleaning up onAuthStateChanged listener.");
        unsubscribeAuth();
      };
    } else {
      console.error("Firebase config is invalid or missing critical keys (apiKey, projectId). Running without database persistence and authentication.");
      setTripItems(defaultTasmaniaTripData.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setLoadingInitialData(false);
      setIsAuthReady(true);
    }
  }, []);

  useEffect(() => {
    if (!db || !userId || !isAuthReady || !auth || !appIdentifier) {
      console.log("initializeTrip useEffect skipped: db, userId, isAuthReady, auth, or appIdentifier not ready.", { db: !!db, userId: !!userId, isAuthReady, auth: !!auth, appIdentifier: !!appIdentifier });
      return;
    }

    const initializeTrip = async () => {
      console.log("Attempting to initialize trip data...");
      setLoadingInitialData(true);
      const tripsCollectionRef = collection(db, `artifacts/${appIdentifier}/public/data/trips`);
      const q = query(tripsCollectionRef);

      const tripsSnapshot = await getDocs(q);

      let selectedTripId;

      if (tripsSnapshot.empty) {
        console.log("No trips found in Firestore. Creating default 'Tasmania 2025' trip and populating.");
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
        for (const [index, item] of defaultTasmaniaTripData.entries()) {
          await setDoc(doc(itineraryCollectionRef, item.id), {
            ...item,
            order: index * 1000 // Give each item an order based on its index
          });
        }
        console.log("Default Tasmania trip created in Firestore.");
      } else {
        selectedTripId = tripsSnapshot.docs[0].id;
        console.log(`Existing trip found. Selecting trip ID: ${selectedTripId}`);
        
        // Check if we need to update with the new full trip data
        const itineraryCollectionRef = collection(db, `artifacts/${appIdentifier}/public/data/trips/${selectedTripId}/itineraryItems`);
        const itinerarySnapshot = await getDocs(itineraryCollectionRef);
        
        // Check if current data matches the new default structure
        const currentItems = [];
        itinerarySnapshot.forEach((doc) => {
          currentItems.push({ id: doc.id, ...doc.data() });
        });
        
        const needsFullUpdate = currentItems.length !== defaultTasmaniaTripData.length || 
          currentItems.some((item, index) => {
            const defaultItem = defaultTasmaniaTripData[index];
            return !defaultItem || item.accommodation !== defaultItem.accommodation;
          });
        
        if (needsFullUpdate) {
          console.log("Updating trip data with full Tasmania itinerary...");
          
          // Delete existing items
          for (const docSnapshot of itinerarySnapshot.docs) {
            await deleteDoc(docSnapshot.ref);
          }
          
          // Add new items with proper structure
          for (const [index, item] of defaultTasmaniaTripData.entries()) {
            await setDoc(doc(itineraryCollectionRef, item.id), {
              ...item,
              order: index * 1000 // Give each item an order based on its index
            });
          }
          
          console.log("Trip data updated successfully with new structure and addresses.");
        } else {
          // Check if existing items need order fields added
          const itemsNeedingOrder = currentItems.filter(item => item.order === undefined);
          if (itemsNeedingOrder.length > 0) {
            console.log("Adding order fields to existing items...");
            for (const [index, item] of currentItems.entries()) {
              if (item.order === undefined) {
                const docRef = doc(itineraryCollectionRef, item.id);
                await updateDoc(docRef, { order: index * 1000 });
              }
            }
            console.log("Order fields added to existing items.");
          }
        }
      }
      setCurrentTripId(selectedTripId);
      setLoadingInitialData(false);
      console.log("Trip initialization complete.");
    };

    if (!currentTripId) {
      initializeTrip();
    }
  }, [db, userId, isAuthReady, auth, currentTripId, appIdentifier]);

  useEffect(() => {
    if (db && currentTripId && appIdentifier) {
      console.log(`Fetching itinerary for currentTripId: ${currentTripId}`);
      const itineraryRef = collection(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`);
      const q = query(itineraryRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          items.push({ 
            id: doc.id, 
            ...data,
            // Add order field if it doesn't exist (for backwards compatibility)
            order: data.order !== undefined ? data.order : new Date(data.date).getTime()
          });
        });
        // Sort by order field first, then by date as fallback
        setTripItems(items.sort((a, b) => {
          if (a.order !== b.order) {
            return a.order - b.order;
          }
          return new Date(a.date) - new Date(b.date);
        }));
        console.log("Itinerary items updated from Firestore.");
      }, (error) => {
        console.error("Error fetching trip itinerary: ", error);
      });

      return () => {
        console.log("Cleaning up itinerary listener.");
        unsubscribe();
      };
    } else {
      console.log("Itinerary useEffect skipped: db, currentTripId, or appIdentifier not ready.", { db: !!db, currentTripId: !!currentTripId, appIdentifier: !!appIdentifier });
    }
  }, [db, currentTripId, appIdentifier]);

  // Function to update travel time for a trip item
  const handleUpdateTravelTime = useCallback(async (itemId, duration, distance) => {
    if (!currentTripId || !db) {
      console.log('Cannot update travel time: no trip selected or db not ready');
      return;
    }

    try {
      const docRef = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`, itemId);
      await updateDoc(docRef, { 
        travelTime: duration,
        distance: distance
      });
      console.log(`✓ Updated travel time for ${itemId}: ${duration} (${distance})`);
    } catch (error) {
      console.error("Error updating travel time:", error);
    }
  }, [currentTripId, db, appIdentifier]);

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
      console.error("CRITICAL ERROR: Firebase Auth object is NULL when handleAuthSubmit was called. This indicates a deeper initialization issue.");
      setAuthError("Authentication service not available. Please try refreshing the page and ensure Firebase is configured correctly.");
      return;
    }

    console.log("Attempting authentication...");
    console.log("Mode:", isLoginMode ? "Login" : "Sign Up");
    console.log("Email:", email);
    console.log("Password:", password ? "********" : "[empty]");

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
      setAuthError(error.message);
      console.log("Firebase error code:", error.code);
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

    const itineraryCollectionRef = collection(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`);
    const newItemRef = doc(itineraryCollectionRef);
    // Set order to current timestamp to add at the end
    const itemToAdd = { 
      ...newItem, 
      id: newItemRef.id,
      order: Date.now()
    };

    try {
      await setDoc(newItemRef, itemToAdd);
      setNewItem({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '' });
      openModal('Trip item added successfully!');
    } catch (error) {
      console.error("Error adding document: ", error);
      openModal('Error adding trip item. Please try again.');
    }
  };

  // Function to move an item up in the order
  const handleMoveUp = async (itemId) => {
    const currentIndex = tripItems.findIndex(item => item.id === itemId);
    if (currentIndex <= 0) return; // Can't move up if it's already first

    const currentItem = tripItems[currentIndex];
    const previousItem = tripItems[currentIndex - 1];

    try {
      // Swap the order values
      const docRef1 = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`, currentItem.id);
      const docRef2 = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`, previousItem.id);
      
      await updateDoc(docRef1, { order: previousItem.order });
      await updateDoc(docRef2, { order: currentItem.order });
      
      console.log(`Moved ${currentItem.location} up in order`);
    } catch (error) {
      console.error("Error moving item up:", error);
      openModal('Error moving item. Please try again.');
    }
  };

  // Function to move an item down in the order
  const handleMoveDown = async (itemId) => {
    const currentIndex = tripItems.findIndex(item => item.id === itemId);
    if (currentIndex >= tripItems.length - 1) return; // Can't move down if it's already last

    const currentItem = tripItems[currentIndex];
    const nextItem = tripItems[currentIndex + 1];

    try {
      // Swap the order values
      const docRef1 = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`, currentItem.id);
      const docRef2 = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`, nextItem.id);
      
      await updateDoc(docRef1, { order: nextItem.order });
      await updateDoc(docRef2, { order: currentItem.order });
      
      console.log(`Moved ${currentItem.location} down in order`);
    } catch (error) {
      console.error("Error moving item down:", error);
      openModal('Error moving item. Please try again.');
    }
  };

  // This function is called by TripList/TripTable when an item's Edit button is clicked
  const handleEditClick = (item) => {
    setEditingItem(item); // Set the item to be edited
    setNewItem(item); // Pre-fill the form with the item's data
    setViewMode('form'); // Switch to form view for editing
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
      const docRef = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`, editingItem.id);
      await updateDoc(docRef, editingItem); // Update the document with the editedItem state
      setEditingItem(null); // Clear editing item state
      setNewItem({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '' }); // Clear form
      setViewMode('table'); // Go back to table view after saving
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
        const docRef = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`, id);
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
      {/* Changed max-w-4xl to max-w-full and added px-4 for padding on smaller screens */}
      <div className="w-full max-w-full bg-white shadow-xl rounded-xl p-6 relative lg:p-8">
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

        {/* View Mode Toggle */}
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={() => setViewMode('table')}
            className={`px-6 py-2 rounded-full font-semibold transition duration-300 ${
              viewMode === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-6 py-2 rounded-full font-semibold transition duration-300 ${
              viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => {
              setEditingItem(null); // Clear any editing state
              setNewItem({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '' }); // Clear form
              setViewMode('form'); // Switch to form view
            }}
            className={`px-6 py-2 rounded-full font-semibold transition duration-300 ${
              viewMode === 'form' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Add New Item
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-6 py-2 rounded-full font-semibold transition duration-300 ${
              viewMode === 'map' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Map View
          </button>
        </div>

        {/* Trip Items Display */}
        <h2 className="text-3xl font-bold text-center text-indigo-700 mb-6">Your Trip Itinerary</h2>
        {tripItems.length === 0 && !loadingInitialData ? (
          <p className="text-center text-gray-500 text-xl py-8">No trip items yet for this trip. Add one above!</p>
        ) : (
          viewMode === 'table' ? (
            <TripTable
              tripItems={tripItems}
              handleEditClick={handleEditClick}
              handleDeleteItem={handleDeleteItem}
              handleMoveUp={handleMoveUp}
              handleMoveDown={handleMoveDown}
              loadingInitialData={loadingInitialData}
            />
          ) : viewMode === 'list' ? (
            <TripList
              tripItems={tripItems}
              editingItem={editingItem}
              handleEditClick={handleEditClick}
              handleDeleteItem={handleDeleteItem}
              handleMoveUp={handleMoveUp}
              handleMoveDown={handleMoveDown}
              handleInputChange={handleInputChange}
              handleSaveEdit={handleSaveEdit}
              loadingInitialData={loadingInitialData}
            />
          ) : viewMode === 'form' ? (
            <TripForm
              newItem={editingItem || newItem} // Use editingItem if present, else newItem
              handleInputChange={handleInputChange}
              onAddItem={handleAddItem} // This will now be used for adding
              onSaveEdit={handleSaveEdit} // New prop for saving edits
              onCancelEdit={() => { // New prop for canceling edits
                setEditingItem(null);
                setNewItem({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '' });
                setViewMode('table'); // Go back to table view
              }}
              openModal={openModal}
              isEditing={!!editingItem} // Pass a flag to indicate edit mode
            />
          ) : ( // viewMode === 'map'
            <TripMap
              tripItems={tripItems}
              loadingInitialData={loadingInitialData}
              onUpdateTravelTime={handleUpdateTravelTime}
            />
          )
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
