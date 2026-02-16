/**
 * @module ApiRoutes
 * @description Defines the REST API endpoints for authentication, sightings, and configuration.
 */

const express = require('express');
const router = express.Router();
const sightingController = require('../controllers/sightingController');
const authController = require('../controllers/authController');
const db = require('../db/database');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Load Config
const configPath = path.resolve(__dirname, '../../../config/settings.yaml');
let CONFIG = {};
try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    CONFIG = yaml.load(fileContents);
} catch (e) {
    console.error('Failed to load settings.yaml:', e);
}

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

// System Status
router.get('/system-status', requireAuth, (req, res) => {
    try {
        const stmt = db.prepare('SELECT status, last_heartbeat FROM system_status WHERE service_name = ?');
        const result = stmt.get('vision_service');

        let isOnline = false;
        let lastHeartbeat = null;

        if (result) {
            // Fix: SQLite stores UTC without 'Z'. Appending 'Z' forces UTC interpretation.
            // Also replacing space with T for ISO compliance
            const dbTime = result.last_heartbeat.replace(' ', 'T') + 'Z';
            lastHeartbeat = new Date(dbTime);

            // Usage of shared config
            const thresholdSeconds = CONFIG.HEARTBEAT_THRESHOLD_SECONDS || 120;
            const thresholdMs = thresholdSeconds * 1000;

            const now = new Date();
            const diff = now - lastHeartbeat;

            if (diff < thresholdMs) {
                isOnline = true;
            }
        }

        res.json({
            service: 'vision_service',
            isOnline,
            lastHeartbeat
        });
    } catch (err) {
        console.error('System status error:', err);
        res.status(500).json({ error: 'Failed to fetch system status' });
    }
});

// Heartbeat Webhook
router.post('/webhook/heartbeat', requireApiKey, (req, res) => {
    try {
        const { service, status, metadata } = req.body;
        const stmt = db.prepare(`
            INSERT INTO system_status (service_name, status, last_heartbeat, metadata)
            VALUES (?, ?, CURRENT_TIMESTAMP, ?)
            ON CONFLICT(service_name) DO UPDATE SET
            status = excluded.status,
            last_heartbeat = CURRENT_TIMESTAMP,
            metadata = excluded.metadata
        `);
        stmt.run(service || 'vision_service', status || 'running', JSON.stringify(metadata || {}));
        res.json({ message: 'Heartbeat received' });
    } catch (err) {
        console.error('Heartbeat error:', err);
        res.status(500).json({ error: 'Failed to process heartbeat' });
    }
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
        res.status(201).json({ message: 'Subscribed' });
    } catch (err) {
        console.error('Subscription error:', err);
        res.status(500).json({ error: 'Failed to save subscription' });
    }
});

router.post('/unsubscribe', requireAuth, (req, res) => {
    try {
        const { endpoint } = req.body;
        const del = db.prepare('DELETE FROM subscriptions WHERE endpoint = ?');
        del.run(endpoint);
        res.json({ message: 'Unsubscribed' });
    } catch (err) {
        console.error('Unsubscribe error:', err);
        res.status(500).json({ error: 'Failed to remove subscription' });
    }
});

module.exports = router;
