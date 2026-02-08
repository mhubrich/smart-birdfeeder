/**
 * @module App
 * @description Main entry point for the Express application. Configures middleware, routes, and background services.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');

const db = require('./db/database');
const apiRoutes = require('./routes/api');
const cleanupService = require('./services/cleanupService');

const app = express();

// Start Background Services
cleanupService.start();
const PORT = process.env.PORT || 3100;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Static Files (Serve captures)
app.use('/static', express.static(path.join(__dirname, '../../static')));

// Routes
app.use('/api', apiRoutes);

// Serve Frontend (Client)
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// SPA Support: Redirect all other requests to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
