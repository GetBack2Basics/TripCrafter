// /api/pexels-proxy.js
// Simple Node.js/Express handler for Netlify or Vercel serverless function
const axios = require('axios');

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || 'LHHAbVyEUsUiHxHFMXpV3ghKgPiwRLo8qD8BI2Gjxc7262qgJ68Pr4lP';
const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

module.exports = async (req, res) => {
  const query = req.query.q || req.body.q;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }
  try {
    const response = await axios.get(PEXELS_API_URL, {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query, per_page: 1, orientation: 'landscape' },
    });
    if (response.data && response.data.photos && response.data.photos.length > 0) {
      const photo = response.data.photos[0];
      return res.json({ url: photo.src.large || photo.src.original, photographer: photo.photographer, photographer_url: photo.photographer_url, alt: photo.alt });
    }
    return res.status(404).json({ error: 'No image found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
