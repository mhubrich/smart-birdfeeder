/**
 * @module ApiRoutes
 * @description Defines the REST API endpoints for authentication, sightings, and configuration.
 */

const express = require('express');
const router = express.Router();
const sightingController = require('../controllers/sightingController');
const authController = require('../controllers/authController');
const db = require('../db/database');

// Auth Middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    next();
};

// API Key Middleware (for Vision Service)
const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
        return res.status(403).json({ message: 'Forbidden: Invalid API Key' });
    }
    next();
};

// Config
router.get('/config', requireAuth, (req, res) => {
    res.json({
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY
    });
});

// Auth
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', authController.me);

// Sightings
router.get('/sightings', requireAuth, sightingController.listSightings);
router.delete('/sightings/:id', requireAuth, sightingController.deleteSighting);

// Webhooks (From Python)
router.post('/webhook/notify', requireApiKey, sightingController.notifySighting);
router.post('/webhook/update', requireApiKey, sightingController.updateSighting);

// Push Subscription
router.post('/subscribe', requireAuth, (req, res) => {
    try {
        const subscription = req.body;
        const insert = db.prepare('INSERT OR IGNORE INTO subscriptions (endpoint, keys_json) VALUES (?, ?)');
        insert.run(subscription.endpoint, JSON.stringify(subscription.keys));
        res.status(201).json({});
    } catch (err) {
        console.error('Subscription error:', err);
        res.status(500).json({ error: 'Failed to save subscription' });
    }
});

module.exports = router;
