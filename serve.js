const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start HTTP server on a different port than WebSocket server
const PORT = process.env.HTTP_PORT || 8080;
app.listen(PORT, () => {
  console.log(`Static server running on http://localhost:${PORT}`);
}); 