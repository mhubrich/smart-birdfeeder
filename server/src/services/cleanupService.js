/**
 * @module CleanupService
 * @description Monitors disk usage and purges old sightings if the threshold is exceeded.
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
 * Gets the current disk usage percentage of the filesystem containing the static folder.
 * @returns {number} Percentage (0-100)
 */
const getDiskUsage = () => {
    try {
        const statsPath = path.join(__dirname, '../../static');
        // Ensure path exists for df
        if (!fs.existsSync(statsPath)) fs.mkdirSync(statsPath, { recursive: true });

        // Run df -k to get usage in kilobytes. Works on Mac and Linux.
        const output = execSync(`df -k "${statsPath}"`).toString();
        const lines = output.trim().split('\n');
        if (lines.length < 2) return 0;

        // Match the percentage (e.g., 45%)
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
 * Performs iterative cleanup of the oldest sightings until disk usage is below threshold.
 */
const runCleanup = async () => {
    const threshold = config.MAX_DISK_USAGE_PERCENT || 85;
    let currentUsage = getDiskUsage();

    console.log(`Checking disk usage: ${currentUsage}% (Threshold: ${threshold}%)`);

    if (currentUsage > threshold) {
        console.log('Starting cleanup due to high disk usage:', { currentUsage, threshold });
    }

    while (currentUsage > threshold) {
        // Get the oldest sighting
        const oldestSighting = await new Promise((resolve) => {
            db.get('SELECT * FROM sightings ORDER BY timestamp ASC LIMIT 1', (err, row) => {
                if (err) {
                    console.error('DB error during cleanup:', err.message);
                    resolve(null);
                }
                resolve(row);
            });
        });

        if (!oldestSighting) {
            console.warn('Disk full but no sightings found to delete.');
            break;
        }

        console.log(`Purging oldest sighting: ${oldestSighting.species} (${oldestSighting.timestamp})`);

        // 1. Delete Files
        deleteSightingAssets(oldestSighting);

        // 2. Delete DB record
        await new Promise((resolve) => {
            db.run('DELETE FROM sightings WHERE id = ?', [oldestSighting.id], (err) => {
                if (err) console.error('Failed to delete DB record:', err.message);
                resolve();
            });
        });

        // Re-check usage
        currentUsage = getDiskUsage();
    }
};

/**
 * Starts the cleanup interval (every 1 hour).
 */
const start = () => {
    // Run once on start
    runCleanup();
    // Use interval from config (default 1 hour)
    const intervalHours = config.CLEANUP_INTERVAL_HOURS || 1;
    setInterval(runCleanup, intervalHours * 60 * 60 * 1000);
};

module.exports = { start };
