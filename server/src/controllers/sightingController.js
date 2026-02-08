/**
 * @module SightingController
 * @description Manages bird sightings, including list retrieval, creation (via webhook), updates, and deletion.
 */

const db = require('../db/database');
const pushService = require('../services/pushService');

// Lists sightings with pagination
exports.listSightings = (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    db.all('SELECT * FROM sightings ORDER BY timestamp DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
};

// Phase 1: Create a new sighting (Notify)
exports.notifySighting = (req, res) => {
    const { species, reason, timestamp, lq_crop_path, status } = req.body;

    const sql = `INSERT INTO sightings (status, species, reason, timestamp, lq_crop_path) VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [status || 'recording', species, reason, timestamp, lq_crop_path], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const sightingId = this.lastID;

        // Trigger Push Notification
        const payload = {
            title: `Bird Detected: ${species}`,
            body: reason,
            icon: '/static/icons/bird-icon-192.png',
            image: `/static/${lq_crop_path}`, // Assumes path is relative to static root or handle accordingly
            data: {
                url: `/sighting/${sightingId}`
            }
        };

        // Send to all subscribers
        db.all('SELECT * FROM subscriptions', [], (err, subs) => {
            if (err) return;
            subs.forEach(sub => {
                const subscription = {
                    endpoint: sub.endpoint,
                    keys: JSON.parse(sub.keys_json)
                };
                pushService.sendNotification(subscription, payload);
            });
        });

        res.status(201).json({ id: sightingId, message: 'Notification sent' });
    });
};

// Phase 2: Update sighting with HQ assets
exports.updateSighting = (req, res) => {
    // Update based on timestamp or ID. Python sends 'original_timestamp'.
    // Ideally we use ID, but let's use timestamp for now as per Python implementation

    // NOTE: Best practice is to return ID from Notify and use it here.
    // But given python script, we'll try to find the match by timestamp + status recording.

    const { original_timestamp, status, hq_snapshot_path, hq_video_path } = req.body;

    const sql = `UPDATE sightings SET status = ?, hq_snapshot_path = ?, hq_video_path = ? WHERE timestamp = ? AND status = 'recording'`;

    db.run(sql, [status, hq_snapshot_path, hq_video_path, original_timestamp], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            // Fallback: update most recent recording if timestamp mismatch slightly?
            // For now, strict match.
            return res.status(404).json({ message: 'No matching recording found' });
        }
        res.json({ message: 'Sighting updated' });
    });
};

// Delete sighting
exports.deleteSighting = (req, res) => {
    const id = req.params.id;
    // TODO: Also delete files from disk
    db.run('DELETE FROM sightings WHERE id = ?', id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
};
