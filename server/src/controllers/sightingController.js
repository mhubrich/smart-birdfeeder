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

        // 1. Get the base sightings
        const rows = db.prepare('SELECT * FROM sightings ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(limit, offset);

        if (rows.length === 0) {
            return res.json([]);
        }

        // 2. Efficiently get counts for all species in the current result set
        // Using a IN clause to minimize DB roundtrips while keeping logic simple
        const speciesInRes = [...new Set(rows.map(r => r.species).filter(s => s !== null))];
        const countMap = {};

        speciesInRes.forEach(species => {
            const countStmt = db.prepare('SELECT COUNT(*) as total FROM sightings WHERE species = ?');
            const result = countStmt.get(species);
            countMap[species] = result ? result.total : 1;
        });

        // 3. Map the counts back to the rows
        const data = rows.map(row => ({
            ...row,
            sightings_count: countMap[row.species] || 1
        }));

        res.json(data);
    } catch (err) {
        console.error('Error listing sightings:', err);
        return res.status(500).json({ error: 'Database error' });
    }
};

// Phase 1: Create a new sighting (Notify)
exports.notifySighting = (req, res) => {
    try {
        const { species, reason, timestamp, status } = req.body;

        const insert = db.prepare(`
            INSERT INTO sightings (status, species, reason, timestamp) 
            VALUES (?, ?, ?, ?)
        `);

        // run() returns information about the changes, including lastInsertRowid
        const result = insert.run(status || 'recording', species, reason, timestamp);
        const sightingId = result.lastInsertRowid;

        // Trigger Push Notifications (Async background task)
        const payload = {
            title: `Bird Detected: ${species}`,
            body: reason,
            icon: '/bird/pwa-192x192.png',
            data: {
                url: `/bird/sighting/${sightingId}`
            }
        };

        const subscribersQuery = db.prepare('SELECT * FROM subscriptions');
        const subs = subscribersQuery.all();

        subs.forEach(async (sub) => {
            try {
                const subscription = {
                    endpoint: sub.endpoint,
                    keys: JSON.parse(sub.keys_json)
                };

                const result = await pushService.sendNotification(subscription, payload);

                if (result.success) {
                    // Update last success timestamp
                    const updateLastNotified = db.prepare('UPDATE subscriptions SET last_notified_at = CURRENT_TIMESTAMP WHERE endpoint = ?');
                    updateLastNotified.run(sub.endpoint);
                } else if (result.statusCode === 410 || result.statusCode === 404) {
                    // Reactive Cleanup: Remove if subscription is expired (404) or gone (410)
                    console.log(`Cleaning up expired subscription: ${sub.endpoint}`);
                    const cleanup = db.prepare('DELETE FROM subscriptions WHERE endpoint = ?');
                    cleanup.run(sub.endpoint);
                } else {
                    console.error(`Failed to send notification to ${sub.endpoint}:`, result.statusCode);
                }
            } catch (pErr) {
                console.error('Failed to process notification for subscriber:', pErr);
            }
        });

        res.status(201).json({ id: sightingId, message: 'Notification sent' });
    } catch (err) {
        console.error('Error creating sighting:', err);
        return res.status(500).json({ error: 'Database error' });
    }
};

// Phase 2: Update sighting with HQ assets (Internal Webhook)
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

// Update sighting details (species, reason) - User Action
exports.updateSightingDetails = (req, res) => {
    try {
        const id = req.params.id;
        const { species, reason } = req.body;

        const update = db.prepare(`
            UPDATE sightings 
            SET species = ?, reason = ? 
            WHERE id = ?
        `);

        const result = update.run(species, reason, id);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Sighting not found' });
        }

        res.json({ message: 'Sighting details updated' });
    } catch (err) {
        console.error('Error updating sighting details:', err);
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
