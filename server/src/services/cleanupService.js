/**
 * @module CleanupService
 * @description Monitors disk usage and purges old sightings using built-in Node.js modules.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const db = require('../db/database');

// Load configuration
const configPath = path.resolve(__dirname, '../../../config/settings.yaml');
let config = { MAX_DISK_USAGE_PERCENT: 80 };

try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    config = yaml.load(fileContents);
} catch (e) {
    console.error('Failed to load settings.yaml in CleanupService:', e.message);
}

/**
 * Gets the current disk usage percentage.
 * @returns {number} Percentage (0-100)
 */
const getDiskUsage = () => {
    try {
        const statsPath = path.join(__dirname, '../../static');
        if (!fs.existsSync(statsPath)) fs.mkdirSync(statsPath, { recursive: true });

        const output = execSync(`df -k "${statsPath}"`).toString();
        const lines = output.trim().split('\n');
        if (lines.length < 2) return 0;

        const match = lines[1].match(/(\d+)%/);
        return match ? parseInt(match[1], 10) : 0;
    } catch (e) {
        console.error('Disk usage check failed:', e.message);
        return 0;
    }
};

/**
 * Deletes a sighting and its associated files.
 * @param {object} sighting 
 */
const deleteSightingAssets = (sighting) => {
    const files = [
        sighting.lq_crop_path,
        sighting.hq_snapshot_path,
        sighting.hq_video_path
    ];

    files.forEach(file => {
        if (file) {
            const fullPath = path.join(__dirname, '../../static', file);
            if (fs.existsSync(fullPath)) {
                try {
                    fs.unlinkSync(fullPath);
                    console.log(`Deleted: ${fullPath}`);
                } catch (err) {
                    console.error(`Failed to delete file ${fullPath}:`, err.message);
                }
            }
        }
    });
};

/**
 * Performs iterative cleanup using synchronous node:sqlite API.
 */
const runCleanup = () => {
    try {
        const threshold = config.MAX_DISK_USAGE_PERCENT || 85;
        let currentUsage = getDiskUsage();

        console.log(`Checking disk usage: ${currentUsage}% (Threshold: ${threshold}%)`);

        while (currentUsage > threshold) {
            // Get the oldest sighting using synchronous API
            const oldestQuery = db.prepare('SELECT * FROM sightings ORDER BY timestamp ASC LIMIT 1');
            const oldestSighting = oldestQuery.get();

            if (!oldestSighting) {
                console.warn('Disk full but no sightings found to delete.');
                break;
            }

            console.log(`Purging oldest sighting: ${oldestSighting.species} (${oldestSighting.timestamp})`);

            // 1. Delete Files
            deleteSightingAssets(oldestSighting);

            // 2. Delete DB record
            const delQuery = db.prepare('DELETE FROM sightings WHERE id = ?');
            delQuery.run(oldestSighting.id);

            // Re-check usage
            currentUsage = getDiskUsage();
        }
    } catch (err) {
        console.error('Cleanup process failed:', err);
    }
};

/**
 * Starts the cleanup interval.
 */
const start = () => {
    runCleanup();
    const intervalHours = config.CLEANUP_INTERVAL_HOURS || 1;
    setInterval(runCleanup, intervalHours * 60 * 60 * 1000);
};

module.exports = { start };
