/**
 * @module SightingController
 * @description Manages bird sightings using the Node.js built-in node:sqlite module.
 */

const db = require('../db/database');
const pushService = require('../services/pushService');

// Lists sightings with pagination
exports.listSightings = (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        // node:sqlite prepare() uses positional parameters
        const query = db.prepare('SELECT * FROM sightings ORDER BY timestamp DESC LIMIT ? OFFSET ?');
        const rows = query.all(limit, offset);

        res.json(rows);
    } catch (err) {
        console.error('Error listing sightings:', err);
        return res.status(500).json({ error: 'Database error' });
    }
};

// Phase 1: Create a new sighting (Notify)
exports.notifySighting = (req, res) => {
    try {
        const { species, reason, timestamp, lq_crop_path, status } = req.body;

        const insert = db.prepare(`
            INSERT INTO sightings (status, species, reason, timestamp, lq_crop_path) 
            VALUES (?, ?, ?, ?, ?)
        `);

        // run() returns information about the changes, including lastInsertRowid
        const result = insert.run(status || 'recording', species, reason, timestamp, lq_crop_path);
        const sightingId = result.lastInsertRowid;

        // Trigger Push Notifications (Async background task)
        const payload = {
            title: `Bird Detected: ${species}`,
            body: reason,
            icon: '/static/icons/bird-icon-192.png',
            image: `/static/${lq_crop_path}`,
            data: {
                url: `/sighting/${sightingId}`
            }
        };

        const subscribersQuery = db.prepare('SELECT * FROM subscriptions');
        const subs = subscribersQuery.all();

        subs.forEach(sub => {
            try {
                const subscription = {
                    endpoint: sub.endpoint,
                    keys: JSON.parse(sub.keys_json)
                };
                pushService.sendNotification(subscription, payload);
            } catch (pErr) {
                console.error('Failed to send notification to subscriber:', pErr);
            }
        });

        res.status(201).json({ id: sightingId, message: 'Notification sent' });
    } catch (err) {
        console.error('Error creating sighting:', err);
        return res.status(500).json({ error: 'Database error' });
    }
};

// Phase 2: Update sighting with HQ assets
exports.updateSighting = (req, res) => {
    try {
        const { original_timestamp, status, hq_snapshot_path, hq_video_path } = req.body;

        const update = db.prepare(`
            UPDATE sightings 
            SET status = ?, hq_snapshot_path = ?, hq_video_path = ? 
            WHERE timestamp = ? AND status = 'recording'
        `);

        const result = update.run(status, hq_snapshot_path, hq_video_path, original_timestamp);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'No matching recording found' });
        }

        res.json({ message: 'Sighting updated' });
    } catch (err) {
        console.error('Error updating sighting:', err);
        return res.status(500).json({ error: 'Database error' });
    }
};

// Delete sighting
exports.deleteSighting = (req, res) => {
    try {
        const id = req.params.id;

        const del = db.prepare('DELETE FROM sightings WHERE id = ?');
        const result = del.run(id);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Sighting not found' });
        }

        // Note: Actual file deletion would happen in a separate service or hook.
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('Error deleting sighting:', err);
        return res.status(500).json({ error: 'Database error' });
    }
};
