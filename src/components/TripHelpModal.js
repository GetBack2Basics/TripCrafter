import React, { useState, useEffect } from 'react';

function TripHelpModal({ isOpen, onClose }) {
  const [helpContent, setHelpContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Fetch the help content from the markdown file
      fetch('/TripHelp.md')
        .then(response => response.text())
        .then(text => {
          setHelpContent(text);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading help content:', error);
          setHelpContent('# Help Content\n\nSorry, help content could not be loaded.');
          setLoading(false);
        });
    }
  }, [isOpen]);

  // Removed unused parseMarkdown function to resolve ESLint error

  const renderContent = () => {
    const sections = helpContent.split('## ').filter(section => section.trim());
    
    return sections.map((section, index) => {
      if (index === 0) {
        // First section includes the main title
        const [title, ...content] = section.split('\n');
        return (
          <section key={index} className="mb-6">
            <h1 className="text-2xl font-bold mb-4 text-indigo-700">{title.replace('# ', '')}</h1>
            {renderSectionContent(content.join('\n'))}
          </section>
        );
      } else {
        const [title, ...content] = section.split('\n');
        return (
          <section key={index} className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">{title}</h2>
            {renderSectionContent(content.join('\n'))}
          </section>
        );
      }
    });
  };

  const renderSectionContent = (content) => {
    const lines = content.split('\n').filter(line => line.trim());
    const elements = [];
    let currentList = [];
    let listType = null;

    lines.forEach((line, index) => {
      if (line.startsWith('### ')) {
        // Flush any pending list
        if (currentList.length > 0) {
          elements.push(renderList(currentList, listType));
          currentList = [];
          listType = null;
        }
        elements.push(
          <h3 key={`h3-${index}`} className="text-lg font-semibold text-gray-700 mb-2 mt-4">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('- ')) {
        if (listType !== 'ul') {
          if (currentList.length > 0) {
            elements.push(renderList(currentList, listType));
          }
          currentList = [];
          listType = 'ul';
        }
        currentList.push(line.replace('- ', ''));
      } else if (line.match(/^\d+\. /)) {
        if (listType !== 'ol') {
          if (currentList.length > 0) {
            elements.push(renderList(currentList, listType));
          }
          currentList = [];
          listType = 'ol';
        }
        currentList.push(line.replace(/^\d+\. /, ''));
      } else if (line.trim()) {
        // Flush any pending list
        if (currentList.length > 0) {
          elements.push(renderList(currentList, listType));
          currentList = [];
          listType = null;
        }
        elements.push(
          <p key={`p-${index}`} className="text-gray-600 mb-3">
            {formatInlineText(line)}
          </p>
        );
      }
    });

    // Flush any remaining list
    if (currentList.length > 0) {
      elements.push(renderList(currentList, listType));
    }

    return elements;
  };

  const renderList = (items, type) => {
    const className = type === 'ol' ? 'list-decimal list-inside space-y-1 mb-3 ml-4' : 'space-y-1 mb-3 ml-4';
    const Tag = type === 'ol' ? 'ol' : 'ul';
    
    return (
      <Tag key={`list-${Math.random()}`} className={className}>
        {items.map((item, index) => (
          <li key={index} className="text-gray-600">
            {type === 'ul' && '• '}{formatInlineText(item)}
          </li>
        ))}
      </Tag>
    );
  };

  const formatInlineText = (text) => {
    // Format bold text
    return text.split(/(\*\*.*?\*\*)/).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-gray-700">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading help content...</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {renderContent()}
            </div>

            <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition duration-300"
              >
                Got it!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TripHelpModal;
