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
router.post('/auth/register', authController.register); // Unprotected for setup

// Sightings
router.get('/sightings', requireAuth, sightingController.listSightings);
router.delete('/sightings/:id', requireAuth, sightingController.deleteSighting);

// Webhooks (From Python - Protected by shared secret or just obscure port/network for now)
// Ideally verify a secret header.
router.post('/webhook/notify', sightingController.notifySighting);
router.post('/webhook/update', sightingController.updateSighting);

// Push Subscription
router.post('/subscribe', (req, res) => {
    const subscription = req.body;
    db.run('INSERT OR IGNORE INTO subscriptions (endpoint, keys_json) VALUES (?, ?)',
        [subscription.endpoint, JSON.stringify(subscription.keys)],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({});
        }
    );
});

module.exports = router;
