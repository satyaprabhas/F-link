require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet({contentSecurityPolicy: false}));
app.use(cors());
app.use(express.json());
app.use(rateLimit({windowMs: 15*60*1000, max: 1000}));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'f-link-api', timestamp: new Date().toISOString() });
});

// Initialize DB
const db = initDatabase();

// Make db available to routers if needed (though we pass it explicitly)
app.set('db', db);

// Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api', require('./routes/api')(db));

// Serve React build if present, or provide API status fallback
const clientDist = path.join(__dirname, '../client/dist');
const clientIndex = path.join(clientDist, 'index.html');

if (fs.existsSync(clientDist) && fs.existsSync(clientIndex)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(clientIndex);
  });
} else {
  app.get('*', (req, res) => {
    res.status(200).json({ 
      status: 'online', 
      service: 'F-LINK Tactical Intelligence API',
      version: '2.5',
      endpoints: {
        auth: '/api/auth/login',
        dashboard: '/api/dashboard',
        health: '/health'
      }
    });
  });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
