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

// Config
router.get('/config', (req, res) => {
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
router.post('/webhook/notify', sightingController.notifySighting);
router.post('/webhook/update', sightingController.updateSighting);

// Push Subscription
router.post('/subscribe', (req, res) => {
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
