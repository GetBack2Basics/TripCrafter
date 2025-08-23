const fs = require('fs');
const path = require('path');

// Read the current file
const filePath = path.join(__dirname, 'src', 'Trip-Default_Tasmania2025.js');
let content = fs.readFileSync(filePath, 'utf8');

// Remove malformed bookingCom fields
content = content.replace(/\s+bookingCom: '',?\s*\n/g, '\n');

// Add type and activityLink fields to entries that don't have them
content = content.replace(
  /(\s+activities: '[^']*',)\s*\n(\s+)(\})/g,
  function(match, activitiesLine, indent, closingBrace) {
    return activitiesLine + '\n' + indent + "type: 'roofed',\n" + indent + "activityLink: '',\n" + indent + closingBrace;
  }
);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('Updated data structure with type and activityLink fields');
