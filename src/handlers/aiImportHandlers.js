// AI Import handlers for App.js
import { collection, doc, setDoc } from 'firebase/firestore';

export const createAIImportHandlers = (appState) => {
  const {
    db,
    currentTripId,
    appIdentifier,
    tripSettings,
    generateActivityLink,
    openModal
  } = appState;

  const handleAIImportSuccess = async (parsedData) => {
    if (!currentTripId) {
      openModal('No trip selected. Please select or create a trip first.');
      return;
    }

    const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData];
    
    try {
      for (const item of dataArray) {
        // Generate activity link if not present
        if (!item.activityLink) {
          item.activityLink = generateActivityLink(
            item.type, 
            item.location, 
            item.date, 
            null, 
            4, 
            tripSettings
          );
        }
        
        const itineraryCollectionRef = collection(
          db, 
          `artifacts/${appIdentifier}/public/data/trips/${currentTripId}/itineraryItems`
        );
        const newItemRef = doc(itineraryCollectionRef);
        const itemToAdd = { 
          ...item, 
          id: newItemRef.id,
          order: Date.now() + dataArray.indexOf(item) // Ensure proper ordering
        };

        await setDoc(newItemRef, itemToAdd);
      }
      
      const itemText = dataArray.length === 1 ? 'item' : 'items';
      openModal(`🎉 ${dataArray.length} trip ${itemText} imported successfully with AI!`);
    } catch (error) {
      console.error("Error adding AI imported items: ", error);
      openModal('Error importing trip data. Please try again.');
    }
  };

  const handleAIImportError = (error) => {
    console.error('AI Import Error:', error);
    openModal(`AI Import failed: ${error}`);
  };

  return {
    handleAIImportSuccess,
    handleAIImportError
  };
};
