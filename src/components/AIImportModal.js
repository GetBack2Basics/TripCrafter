import React, { useState } from 'react';
import { aiImportService } from '../services/aiImportService';
import AIImportReview from './AIImportReview';

function AIImportModal({ isOpen, onClose, onImportSuccess, onError }) {
  const [reviewData, setReviewData] = useState(null);
  const [importType, setImportType] = useState('url');
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [llmPrompt, setLlmPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [manualJson, setManualJson] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isProcessing) return;
    
    let source = null;
    
    if (importType === 'url') {
      if (!inputValue.trim()) {
        onError('Please enter a URL');
        return;
      }
      source = inputValue.trim();
    } else if (importType === 'pdf') {
      if (!selectedFile) {
        onError('Please select a PDF file');
        return;
      }
      source = selectedFile;
    } else if (importType === 'text') {
      if (!inputValue.trim()) {
        onError('Please enter some text');
        return;
      }
      source = inputValue.trim();
    }

    setIsProcessing(true);

    try {
      const result = await aiImportService.importFromSource(source, importType);
      if (result.success) {
        setReviewData(result.data);
      } else {
        // On error, show the generated prompt for manual LLM use and show JSON page immediately
        const prompt = await aiImportService.getPrompt(source, importType);
        setLlmPrompt(prompt);
        setShowPrompt(true);
        onError(result.error);
        // Do NOT close the modal, let user see the JSON page immediately
      }
    } catch (error) {
      onError(error.message);
      handleClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualJsonSubmit = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(manualJson);
      setReviewData(data);
    } catch (err) {
      onError('Invalid JSON. Please check your LLM output.');
    }
  };

  // Review/merge handlers
  const handleMerge = (entry) => {
    // Merge entry into trip (call onImportSuccess with just this entry)
    onImportSuccess([entry]);
    setReviewData(null);
    handleClose();
  };
  const handleIgnore = (entry) => {
    // Remove entry from reviewData
    setReviewData(prev => prev.filter(e => e !== entry));
  };
  const handleReplace = (entry) => {
    // Replace existing entry for this date/type with this one (call onImportSuccess with just this entry)
    onImportSuccess([entry], { replace: true });
    setReviewData(null);
    handleClose();
  };
  const handleEdit = (entry) => {
    // Could open an edit modal, for now just call merge
    onImportSuccess([entry]);
    setReviewData(null);
    handleClose();
  };
  const handleCancelReview = () => {
    setReviewData(null);
  };

  const handleClose = () => {
    setInputValue('');
    setSelectedFile(null);
    setImportType('url');
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const handleTestSample = async (sampleKey) => {
    setIsProcessing(true);
    try {
      const result = await aiImportService.testWithSample(sampleKey);
      
      if (result.success) {
        onImportSuccess(result.data);
        handleClose();
      } else {
        onError(result.error);
      }
    } catch (error) {
      onError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;
  if (reviewData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
          <AIImportReview
            importedData={reviewData}
            onMerge={handleMerge}
            onIgnore={handleIgnore}
            onReplace={handleReplace}
            onEdit={handleEdit}
            onCancel={handleCancelReview}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-indigo-600">
              🤖 AI Import
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={isProcessing}
            >
              ×
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Import trip data from booking confirmations, itineraries, or travel websites using AI parsing.
          </p>

          {/* Show prompt for manual LLM use if needed */}
          {showPrompt && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded">
              <div className="font-semibold mb-2 text-yellow-800">AI Import failed. You can copy the prompt below and paste it into Gemini, ChatGPT, or another LLM. Then paste the JSON result below to import manually.</div>
              <textarea
                className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-xs mb-2"
                value={llmPrompt}
                readOnly
                rows={8}
                onFocus={e => e.target.select()}
              />
              <form onSubmit={handleManualJsonSubmit} className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Paste LLM JSON result here:</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded bg-white text-xs"
                  value={manualJson}
                  onChange={e => setManualJson(e.target.value)}
                  rows={6}
                  placeholder="Paste the JSON output from Gemini, ChatGPT, etc."
                />
                <div className="flex justify-end mt-2">
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">Import JSON</button>
                </div>
              </form>
            </div>
          )}

          {/* Import Type Selector and main form, hidden if showing prompt */}
          {!showPrompt && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Import Source
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setImportType('url')}
                    className={`p-3 text-center rounded-lg border-2 transition duration-200 ${
                      importType === 'url'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={isProcessing}
                  >
                    <div className="text-2xl mb-1">🌐</div>
                    <div className="text-sm font-medium">Website URL</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportType('pdf')}
                    className={`p-3 text-center rounded-lg border-2 transition duration-200 ${
                      importType === 'pdf'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={isProcessing}
                  >
                    <div className="text-2xl mb-1">📄</div>
                    <div className="text-sm font-medium">PDF File</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportType('text')}
                    className={`p-3 text-center rounded-lg border-2 transition duration-200 ${
                      importType === 'text'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={isProcessing}
                  >
                    <div className="text-2xl mb-1">📝</div>
                    <div className="text-sm font-medium">Text/Email</div>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Input Fields */}
                <div className="mb-6">
                  {importType === 'url' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="https://example.com/booking-confirmation"
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Paste the URL of a booking confirmation, itinerary, or travel website
                      </p>
                    </div>
                  )}
                  {importType === 'pdf' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PDF File
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Upload a PDF booking confirmation, itinerary, or travel document
                      </p>
                    </div>
                  )}
                  {importType === 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Content
                      </label>
                      <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Paste booking confirmation email, itinerary text, or travel details..."
                        rows="6"
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Paste text from emails, booking confirmations, or travel documents
                      </p>
                    </div>
                  )}
                </div>
                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className={`
                      flex-1 py-3 px-6 rounded-md font-semibold transition duration-200
                      ${isProcessing
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }
                    `}
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      '🚀 Import with AI'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isProcessing}
                    className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Test Samples */}
          {!isProcessing && !showPrompt && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">Try these sample bookings:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleTestSample('hotelBooking')}
                  className="px-3 py-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition duration-200"
                >
                  Hotel Booking
                </button>
                <button
                  onClick={() => handleTestSample('ferryTicket')}
                  className="px-3 py-2 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition duration-200"
                >
                  Ferry Ticket
                </button>
                <button
                  onClick={() => handleTestSample('campingReservation')}
                  className="px-3 py-2 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition duration-200"
                >
                  Camping Site
                </button>
                <button
                  onClick={() => handleTestSample('multipleBookings')}
                  className="px-3 py-2 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition duration-200"
                >
                  Multi-day Trip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIImportModal;
