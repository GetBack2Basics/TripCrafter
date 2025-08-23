const fs = require('fs');
const path = require('path');

// Read the current file
const filePath = path.join(__dirname, 'src', 'Trip-Default_Tasmania2025.js');
let content = fs.readFileSync(filePath, 'utf8');

// Add bookingCom field to entries that don't have it
content = content.replace(
  /(\s+activities: '[^']*',)(\s+)(\})/g, 
  "$1$2bookingCom: '',\$2$3"
);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('Added bookingCom field to all entries');
