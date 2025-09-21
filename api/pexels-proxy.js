// Deprecated proxy: this project uses Unsplash dynamic image URLs (source.unsplash.com) in the client.
module.exports = (req, res) => {
  res.status(410).json({ error: 'pexels-proxy is deprecated and removed. Use Unsplash source images instead.' });
};
