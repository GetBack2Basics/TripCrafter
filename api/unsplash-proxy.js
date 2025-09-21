// Deprecated proxy: prefer client-side Unsplash source URLs for discover images.
module.exports = (req, res) => {
  res.status(410).json({ error: 'unsplash-proxy is deprecated. Use source.unsplash.com client URLs instead.' });
};
