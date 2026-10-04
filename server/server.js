require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet({contentSecurityPolicy: false}));
app.use(cors());
app.use(express.json());
app.use(rateLimit({windowMs: 15*60*1000, max: 1000}));

// Initialize DB
const db = initDatabase();

// Make db available to routers if needed (though we pass it explicitly)
app.set('db', db);

// Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api', require('./routes/api')(db));

// Serve React build in production (commented out for API-only development)
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
