/* global __app_id, __firebase_config, __initial_auth_token */
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
// Added 'doc' to the Firestore import list
import { getFirestore, doc, setDoc, collection, query, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';

// Define the shape of a trip item
const initialTripItems = [
  {
    id: 'spirit-of-tasmania-sailing1',
    date: '2025-12-22',
    location: 'Geelong to Devonport',
    accommodation: 'Spirit of Tasmania (Sailing 1)',
    status: 'Booked',
    notes: 'Depart Geelong 08:30, Arrive Devonport 19:00. 4 adults, 2 recliner accessible, 2 day tickets, 1 vehicle.',
    travelTime: '10h 30m',
  },
  {
    id: 'scamander-sanctuary',
    date: '2025-12-24',
    location: 'Scamander Sanctuary Holiday Park',
    accommodation: 'Scamander Sanctuary Holiday Park',
    status: 'Booked',
    notes: 'Accommodation for George Corea (24 Dec 2025 to 25 Dec 2025).',
    travelTime: '', // To be filled in
  },
  {
    id: 'cethana-campground',
    date: '2026-01-09',
    location: 'Cethana Campground',
    accommodation: 'Cethana Campground',
    status: 'Booked',
    notes: 'Trip dates: Fri, Jan 9th to Sun, Jan 11th. Group size: 3 Adults, 1 Vehicle.',
    travelTime: '', // To be filled in
  },
  {
    id: 'spirit-of-tasmania-sailing2',
    date: '2026-01-13',
    location: 'Devonport to Geelong',
    accommodation: 'Spirit of Tasmania (Sailing 2)',
    status: 'Booked',
    notes: 'Depart Devonport 08:30, Arrive Geelong 19:00. 3 adults, 1 recliner, 2 day tickets, 1 vehicle.',
    travelTime: '10h 30m',
  },
];

function App() {
  const [tripItems, setTripItems] = useState([]);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null); // Keep auth state for potential future use, ESLint might still warn but won't block build
  const [userId, setUserId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalConfirmAction, setModalConfirmAction] = useState(null);

  // Initialize Firebase and set up authentication
  useEffect(() => {
    // Suppress ESLint warning for __app_id, __firebase_config, __initial_auth_token here
    // eslint-disable-next-line no-undef
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    // eslint-disable-next-line no-undef
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

    if (Object.keys(firebaseConfig).length > 0) {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      setDb(firestore);
      const firebaseAuth = getAuth(app); // Assign to a local variable as `auth` state isn't used directly
      setAuth(firebaseAuth); // Still set the state for potential future use

      const signIn = async () => {
        try {
          // eslint-disable-next-line no-undef
          if (typeof __initial_auth_token !== 'undefined') {
            // eslint-disable-next-line no-undef
            await signInWithCustomToken(firebaseAuth, __initial_auth_token);
          } else {
            await signInAnonymously(firebaseAuth);
          }
        } catch (error) {
          console.error("Error signing in:", error);
        }
      };

      signIn();

      onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          setUserId(crypto.randomUUID()); // Anonymous user or not signed in
        }
      });
    } else {
      console.log("Firebase config not available, running without database persistence.");
      // If Firebase config is not available, use initialTripItems directly.
      setTripItems(initialTripItems);
    }
  }, []);

  // Fetch data from Firestore once authenticated
  useEffect(() => {
    if (db && userId) {
      // eslint-disable-next-line no-undef
      const tripRef = collection(db, `artifacts/${__app_id}/public/data/tripItems`);
      const q = query(tripRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        // Sort items by date before setting them
        items.sort((a, b) => new Date(a.date) - new Date(b.date));
        setTripItems(items);
      }, (error) => {
        console.error("Error fetching trip items: ", error);
        // If there's an error, or no data, initialize with default data
        // This will now write to the public collection
        if (tripItems.length === 0) {
          initialTripItems.forEach(async (item) => {
            // eslint-disable-next-line no-undef
            const itemRef = doc(db, `artifacts/${__app_id}/public/data/tripItems`, item.id);
            await setDoc(itemRef, item);
          });
          setTripItems(initialTripItems.sort((a, b) => new Date(a.date) - new Date(b.date)));
        }
      });

      return () => unsubscribe();
    }
    // Added tripItems.length to dependencies to satisfy react-hooks/exhaustive-deps
  }, [db, userId, tripItems.length]); // Added tripItems.length here

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

  const handleAddItem = async () => {
    if (!newItem.date || !newItem.location || !newItem.accommodation) {
      openModal('Please fill in all required fields (Date, Location, Accommodation).');
      return;
    }

    const itemToAdd = { ...newItem, id: doc(collection(db, 'temp')).id }; // Generate a temporary ID
    try {
      if (db && userId) {
        // eslint-disable-next-line no-undef
        const docRef = doc(db, `artifacts/${__app_id}/public/data/tripItems`, itemToAdd.id);
        await setDoc(docRef, itemToAdd);
      } else {
        setTripItems([...tripItems, itemToAdd].sort((a, b) => new Date(a.date) - new Date(b.date)));
      }
      setNewItem({ date: '', location: '', accommodation: '', status: 'Unconfirmed', notes: '', travelTime: '' });
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

    try {
      if (db && userId) {
        // eslint-disable-next-line no-undef
        const docRef = doc(db, `artifacts/${__app_id}/public/data/tripItems`, editingItem.id);
        await updateDoc(docRef, editingItem);
      } else {
        setTripItems(tripItems.map((item) => (item.id === editingItem.id ? editingItem : item)).sort((a, b) => new Date(a.date) - new Date(b.date)));
      }
      setEditingItem(null);
      openModal('Trip item updated successfully!');
    } catch (error) {
      console.error("Error updating document: ", error);
      openModal('Error updating trip item. Please try again.');
    }
  };

  const handleDeleteItem = (id) => {
    openModal('Are you sure you want to delete this trip item?', async () => {
      try {
        if (db && userId) {
          // eslint-disable-next-line no-undef
          const docRef = doc(db, `artifacts/${__app_id}/public/data/tripItems`, id);
          await deleteDoc(docRef);
        } else {
          setTripItems(tripItems.filter((item) => item.id !== id));
        }
        openModal('Trip item deleted successfully!');
      }
       catch (error) {
        console.error("Error deleting document: ", error);
        openModal('Error deleting trip item. Please try again.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4 font-inter text-gray-800 flex justify-center items-center">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl p-6 relative">
        <h1 className="text-4xl font-bold text-center text-indigo-700 mb-8 tracking-wide">
          Trip Crafter
        </h1>

        {userId && (
          <div className="text-center text-sm text-gray-600 mb-6">
            Share this app with others. The data is now publicly accessible within this app for all users. Your current User ID is: <span className="font-mono bg-gray-100 px-2 py-1 rounded-md">{userId}</span>
          </div>
        )}

        {/* Modal for messages and confirmations */}
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
            <textarea
              name="notes"
              value={newItem.notes}
              onChange={handleInputChange}
              placeholder="Notes (e.g., activities, guest details)"
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
        {tripItems.length === 0 ? (
          <p className="text-center text-gray-500 text-xl py-8">No trip items yet. Add one above!</p>
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
      </div>
    </div>
  );
}

export default App;
