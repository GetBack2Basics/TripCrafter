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

// Utility function to generate activity links based on type
const generateActivityLink = (type, location, checkinDate, checkoutDate = null, adults = 4, tripSettings = {}) => {
  if (!location) return '';
  
  const locationParts = location.split(',');
  const cityName = locationParts[0].trim();
  
  // Extract state and country from trip settings or default to Tasmania, Australia
  const state = tripSettings.state || 'Tasmania';
  const country = tripSettings.country || 'Australia';
  
  switch(type) {
    case 'roofed':
      // Generate Booking.com URL with state and country context
      if (!checkinDate) return '';
      
      const checkin = new Date(checkinDate);
      const checkinYear = checkin.getFullYear();
      const checkinMonth = checkin.getMonth() + 1;
      const checkinDay = checkin.getDate();
      
      let checkout;
      if (checkoutDate) {
        checkout = new Date(checkoutDate);
      } else {
        checkout = new Date(checkin);
        checkout.setDate(checkout.getDate() + 1);
      }
      
      const checkoutYear = checkout.getFullYear();
      const checkoutMonth = checkout.getMonth() + 1;
      const checkoutDay = checkout.getDate();
      
      const baseUrl = 'https://www.booking.com/searchresults.html';
      const searchLocation = `${cityName}, ${state}, ${country}`;
      const params = new URLSearchParams({
        ss: searchLocation,
        checkin: `${checkinYear}-${String(checkinMonth).padStart(2, '0')}-${String(checkinDay).padStart(2, '0')}`,
        checkout: `${checkoutYear}-${String(checkoutMonth).padStart(2, '0')}-${String(checkoutDay).padStart(2, '0')}`,
        group_adults: adults.toString()
      });
      
      return `${baseUrl}?${params.toString()}`;
      
    case 'camp':
      // Generate Google search for campsites with state context
      const campSearchQuery = encodeURIComponent(`campsites near ${cityName} ${state} ${country}`);
      return `https://www.google.com/search?q=${campSearchQuery}`;
      
    case 'enroute':
      // Generate Google search for activities with state context
      const searchQuery = encodeURIComponent(`things to do ${cityName} ${state} ${country} activities attractions`);
      return `https://www.google.com/search?q=${searchQuery}`;
      
    default:
      return '';
  }
};

function App() {
  const [tripItems, setTripItems] = useState([]);
  const [tripSettings, setTripSettings] = useState({ 
    state: 'Tasmania', 
    country: 'Australia',
    name: 'Tasmania 2025 Trip'
  });
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalConfirmAction, setModalConfirmAction] = useState(null);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
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
            order: data.order !== undefined ? data.order : new Date(data.date).getTime(),
            // Add type field if it doesn't exist (for backwards compatibility)
            type: data.type || 'roofed',
            // Handle migration from bookingCom to activityLink
            activityLink: data.activityLink || data.bookingCom || ''
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

  // Load and save trip settings
  useEffect(() => {
    if (db && currentTripId && appIdentifier) {
      console.log(`Loading trip settings for: ${currentTripId}`);
      const settingsRef = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/settings`, 'config');
      
      // Try to load existing settings
      const unsubscribe = onSnapshot(settingsRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const settings = docSnapshot.data();
          setTripSettings({
            state: settings.state || 'Tasmania',
            country: settings.country || 'Australia', 
            name: settings.name || 'Trip'
          });
          console.log("Trip settings loaded from Firestore:", settings);
        } else {
          console.log("No trip settings found, using defaults");
          // Save default settings
          setDoc(settingsRef, {
            state: 'Tasmania',
            country: 'Australia', 
            name: 'Trip'
          }, { merge: true }).catch(error => {
            console.error("Error saving default trip settings:", error);
          });
        }
      }, (error) => {
        console.error("Error loading trip settings:", error);
      });

      return () => unsubscribe();
    }
  }, [db, currentTripId, appIdentifier]);

  // Save trip settings when they change
  const saveTripSettings = async (newSettings) => {
    if (db && currentTripId && appIdentifier) {
      try {
        const settingsRef = doc(db, `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/settings`, 'config');
        await setDoc(settingsRef, newSettings, { merge: true });
        setTripSettings(newSettings);
        console.log("Trip settings saved:", newSettings);
      } catch (error) {
        console.error("Error saving trip settings:", error);
      }
    }
  };

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
      const updatedItem = { ...editingItem, [name]: value };
      
      // Auto-generate activity link if location, date, or type changes
      if (name === 'location' || name === 'date' || name === 'type') {
        const nextDayDate = new Date(updatedItem.date || new Date());
        nextDayDate.setDate(nextDayDate.getDate() + 1);
        updatedItem.activityLink = generateActivityLink(
          updatedItem.type, 
          updatedItem.location, 
          updatedItem.date, 
          nextDayDate.toISOString().split('T')[0],
          4,
          tripSettings
        );
      }
      
      setEditingItem(updatedItem);
    } else {
      const updatedItem = { ...newItem, [name]: value };
      
      // Auto-generate activity link if location, date, or type changes
      if (name === 'location' || name === 'date' || name === 'type') {
        const nextDayDate = new Date(updatedItem.date || new Date());
        nextDayDate.setDate(nextDayDate.getDate() + 1);
        updatedItem.activityLink = generateActivityLink(
          updatedItem.type, 
          updatedItem.location, 
          updatedItem.date, 
          nextDayDate.toISOString().split('T')[0],
          4,
          tripSettings
        );
      }
      
      setNewItem(updatedItem);
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
      setNewItem({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
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
      setNewItem({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' }); // Clear form
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

        {/* Trip Settings and Auth status */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setShowTripSettings(true)}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 transform hover:scale-105"
            >
              Trip Settings
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 transform hover:scale-105"
            >
              Help & Guide
            </button>
          </div>
          <div className="text-center text-sm text-gray-600">
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
        </div>

        {/* Trip Settings Modal */}
        {showTripSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full m-4">
              <h2 className="text-xl font-bold mb-4">Trip Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trip Name
                  </label>
                  <input
                    type="text"
                    value={tripSettings.name}
                    onChange={(e) => setTripSettings({...tripSettings, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., Tasmania 2025 Trip"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={tripSettings.state}
                    onChange={(e) => setTripSettings({...tripSettings, state: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., Tasmania, California, New South Wales"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={tripSettings.country}
                    onChange={(e) => setTripSettings({...tripSettings, country: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., Australia, USA, Canada"
                  />
                </div>
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                  <strong>Why this matters:</strong> State and country are added to all Booking.com and Google searches to ensure accurate location results. For example, searches will be for "Hobart, Tasmania, Australia" instead of just "Hobart".
                </div>
              </div>
              <div className="flex space-x-2 mt-6">
                <button
                  onClick={() => {
                    saveTripSettings(tripSettings);
                    setShowTripSettings(false);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                >
                  Save Settings
                </button>
                <button
                  onClick={() => setShowTripSettings(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-md transition duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-indigo-700">TripCrafter - User Guide</h2>
              
              <div className="space-y-6">
                {/* Overview */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">📍 Overview</h3>
                  <p className="text-gray-600">
                    TripCrafter helps you plan and organize your trip itinerary with intelligent activity links, 
                    route ordering, and map visualization. Each trip item automatically generates relevant links 
                    based on its type (accommodation, camping, or activities).
                  </p>
                </section>

                {/* Getting Started */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">🚀 Getting Started</h3>
                  <ol className="list-decimal list-inside text-gray-600 space-y-1">
                    <li><strong>Configure Trip Settings:</strong> Click "Trip Settings" to set your trip's state and country for accurate search results</li>
                    <li><strong>Add Trip Items:</strong> Use the form to add locations, dates, and accommodations</li>
                    <li><strong>Set Item Types:</strong> Choose the correct type for each item to get relevant activity links</li>
                    <li><strong>Reorder Items:</strong> Use move up/down buttons to organize your route</li>
                    <li><strong>View on Map:</strong> Switch to Map view to see your route and travel times</li>
                  </ol>
                </section>

                {/* Trip Item Types */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">🏨 Trip Item Types</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-3 rounded-md">
                      <div className="font-semibold text-green-700 mb-1">🏨 Roofed</div>
                      <div className="text-sm text-gray-600">Hotels, B&Bs, apartments</div>
                      <div className="text-xs text-blue-600 mt-1">→ Generates Booking.com links</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-md">
                      <div className="font-semibold text-orange-700 mb-1">⛺ Camp</div>
                      <div className="text-sm text-gray-600">Camping, RV parks, outdoor stays</div>
                      <div className="text-xs text-blue-600 mt-1">→ Generates Google camping search</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-md">
                      <div className="font-semibold text-blue-700 mb-1">🚗 Enroute</div>
                      <div className="text-sm text-gray-600">Transit, activities, stops</div>
                      <div className="text-xs text-blue-600 mt-1">→ Generates Google activities search</div>
                    </div>
                  </div>
                </section>

                {/* Views */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">👀 Views</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="font-semibold text-gray-700 mb-1">📋 Table View</div>
                      <div className="text-sm text-gray-600">Compact overview with all details, move buttons, and activity links</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="font-semibold text-gray-700 mb-1">📱 List View</div>
                      <div className="text-sm text-gray-600">Card-based mobile-friendly view with editing capabilities</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="font-semibold text-gray-700 mb-1">🗺️ Map View</div>
                      <div className="text-sm text-gray-600">Visual route with travel times and distance calculations</div>
                    </div>
                  </div>
                </section>

                {/* Key Features */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">⭐ Key Features</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">🔗 Smart Activity Links</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Auto-generated based on location and type</li>
                        <li>• Include state/country for accuracy</li>
                        <li>• Update automatically when location changes</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">📍 Route Management</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Move items up/down to reorder route</li>
                        <li>• Map view shows optimized travel path</li>
                        <li>• Automatic travel time calculations</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">☁️ Cloud Sync</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Real-time synchronization across devices</li>
                        <li>• Anonymous or email-based accounts</li>
                        <li>• Automatic backup of all changes</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">✏️ Easy Editing</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Click any item to edit details</li>
                        <li>• Bulk actions for status updates</li>
                        <li>• Drag-and-drop reordering (coming soon)</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Tips */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">💡 Pro Tips</h3>
                  <div className="bg-yellow-50 p-4 rounded-md">
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li><strong>🎯 Precise Locations:</strong> Use full addresses or landmark names for better search results</li>
                      <li><strong>📅 Date Planning:</strong> Activity links for accommodations include your check-in dates</li>
                      <li><strong>🗺️ Route Optimization:</strong> Arrange items in geographic order using move buttons</li>
                      <li><strong>⚙️ Trip Settings:</strong> Set correct state/country to avoid location confusion (e.g., "Paris, Texas" vs "Paris, France")</li>
                      <li><strong>🔄 Real-time Updates:</strong> Changes sync automatically - no need to save manually</li>
                    </ul>
                  </div>
                </section>

                {/* Workflow */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">🔄 Recommended Workflow</h3>
                  <div className="bg-blue-50 p-4 rounded-md">
                    <ol className="text-sm text-gray-700 space-y-2">
                      <li><strong>1. Plan:</strong> Configure trip settings and add all your destinations</li>
                      <li><strong>2. Organize:</strong> Set correct types and reorder items for logical travel flow</li>
                      <li><strong>3. Research:</strong> Use activity links to find and book accommodations/activities</li>
                      <li><strong>4. Navigate:</strong> Use map view during travel to see route and travel times</li>
                      <li><strong>5. Update:</strong> Mark items as "Booked" or "Confirmed" as you make reservations</li>
                    </ol>
                  </div>
                </section>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowHelp(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition duration-300"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}

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
              setNewItem({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' }); // Clear form
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
                setNewItem({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '', activities: '', type: 'roofed', activityLink: '' });
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
