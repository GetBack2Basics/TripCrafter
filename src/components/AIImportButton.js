import React from 'react';

function AIImportButton({ onClick, disabled = false, size = 'default' }) {
  const sizeClasses = {
    small: 'px-3 py-2 text-sm',
    default: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        bg-gradient-to-r from-purple-600 to-indigo-600 
        hover:from-purple-700 hover:to-indigo-700
        text-white font-semibold rounded-lg
        shadow-md hover:shadow-lg
        transition duration-300 transform hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-purple-400
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        flex items-center space-x-2
      `}
      title="Import trip data from URLs, PDFs, or text using AI"
    >
      <span className="text-xl">🤖</span>
      <span>AI Import</span>
    </button>
  );
}

export default AIImportButton;
