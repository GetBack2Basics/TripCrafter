// Node.js script to download Unsplash images for each trip location
const fs = require('fs');
const path = require('path');

const https = require('https');
const http = require('http');
const axios = require('axios');
const tripData = require('../src/Trip-Default_Tasmania2025').default || require('../src/Trip-Default_Tasmania2025');

const outDir = path.join(__dirname, '../public/discover-images');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}


const PEXELS_API_KEY = 'LHHAbVyEUsUiHxHFMXpV3ghKgPiwRLo8qD8BI2Gjxc7262qgJ68Pr4lP';
const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

async function getPexelsImageUrl(query) {
  try {
    const response = await axios.get(PEXELS_API_URL, {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query, per_page: 1, orientation: 'landscape' },
    });
    if (response.data && response.data.photos && response.data.photos.length > 0) {
      return response.data.photos[0].src.large || response.data.photos[0].src.original;
    }
    return null;
  } catch (e) {
    console.error(`Pexels API error for '${query}':`, e.message);
    return null;
  }
}

async function main() {
  const locations = Array.from(new Set(tripData.map(item => item.location)));
  for (const location of locations) {
    const filename = sanitizeFilename(location) + '.jpg';
    const dest = path.join(outDir, filename);
    if (fs.existsSync(dest)) {
      console.log(`Already downloaded: ${filename}`);
      continue;
    }
    console.log(`Searching Pexels for: ${location}`);
    const imageUrl = await getPexelsImageUrl(location);
    if (!imageUrl) {
      console.error(`No image found for ${location}`);
      continue;
    }
    console.log(`Downloading for ${location} from ${imageUrl}...`);
    try {
      await downloadImage(imageUrl, dest);
      console.log(`Saved: ${filename}`);
    } catch (e) {
      console.error(`Failed for ${location}:`, e.message);
    }
  }
}

main();
