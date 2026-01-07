const express = require('express');
const cors = require('cors');
require('dotenv').config();

const scraperController = require('./controllers/scraperController');
const agentController = require('./controllers/agentController');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('frontend'));

// Routes
app.post('/api/scrape', scraperController.scrapeWebsite);
app.post('/api/ask', agentController.askAgent);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend
app.get('/', (req, res) => res.sendFile(__dirname + '/frontend/index.html'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Open http://localhost:${PORT} in your browser`);
});
