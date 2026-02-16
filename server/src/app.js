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
app.set('trust proxy', 1); // Enable trusting proxy headers from Cloudflare


// Start Background Services
cleanupService.start();
const PORT = process.env.PORT || 3100;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "https://static.cloudflareinsights.com"],
            "connect-src": ["'self'", "https://cloudflareinsights.com"],
        },
    },
}));
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true, // Required for HTTPS
        sameSite: 'lax'
    }
}));


// Static Files (Serve captures)
const staticPath = path.join(__dirname, '../../static');
app.use('/static', express.static(staticPath));
app.use('/bird/static', express.static(staticPath));

// Routes
app.use('/api', apiRoutes);
app.use('/bird/api', apiRoutes);


// Serve Frontend (Client)
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use('/bird', express.static(clientDistPath));
app.use(express.static(clientDistPath));

// SPA Support: Redirect all other requests to index.html
app.get(['/bird', '/bird/*'], (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});


// Start Server
app.listen(PORT, () => {
    console.log('App Server started on port:', PORT);
});

module.exports = app;
