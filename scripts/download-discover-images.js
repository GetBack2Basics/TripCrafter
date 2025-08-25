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


async function getPexelsImageUrls(query, count = 3) {
  try {
    const response = await axios.get(PEXELS_API_URL, {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query, per_page: count, orientation: 'landscape' },
    });
    if (response.data && response.data.photos && response.data.photos.length > 0) {
      return response.data.photos.map(photo => photo.src.large || photo.src.original);
    }
    return [];
  } catch (e) {
    console.error(`Pexels API error for '${query}':`, e.message);
    return [];
  }
}

async function main() {
  const locations = Array.from(new Set(tripData.map(item => item.location)));
  for (const location of locations) {
    const base = sanitizeFilename(location);
    // Download up to 3 images per location
    console.log(`Searching Pexels for: ${location}`);
    const imageUrls = await getPexelsImageUrls(location, 3);
    if (!imageUrls.length) {
      console.error(`No images found for ${location}`);
      continue;
    }
    for (let i = 0; i < imageUrls.length; i++) {
      const filename = `${base}_${i+1}.jpg`;
      const dest = path.join(outDir, filename);
      if (fs.existsSync(dest)) {
        console.log(`Already downloaded: ${filename}`);
        continue;
      }
      const imageUrl = imageUrls[i];
      console.log(`Downloading for ${location} [${i+1}] from ${imageUrl}...`);
      try {
        await downloadImage(imageUrl, dest);
        console.log(`Saved: ${filename}`);
      } catch (e) {
        console.error(`Failed for ${location} [${i+1}]:`, e.message);
      }
    }
    // Also save the first image as the fallback base.jpg if not present
    const fallbackFilename = `${base}.jpg`;
    const fallbackDest = path.join(outDir, fallbackFilename);
    if (!fs.existsSync(fallbackDest) && imageUrls[0]) {
      try {
        await downloadImage(imageUrls[0], fallbackDest);
        console.log(`Saved fallback: ${fallbackFilename}`);
      } catch (e) {
        console.error(`Failed for fallback ${location}:`, e.message);
      }
    }
  }
}

main();
