const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Backend server is running' });
});

// Placeholder endpoints for future implementation
app.get('/api/videos', (req, res) => {
  res.json({ message: 'Videos endpoint - to be implemented' });
});

app.post('/api/videos/upload', (req, res) => {
  res.json({ message: 'Video upload endpoint - to be implemented' });
});

app.post('/api/videos/:videoId/chat', (req, res) => {
  res.json({ message: 'Chat endpoint - to be implemented' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});