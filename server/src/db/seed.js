/**
 * @module Seed
 * @description Utility script to seed the database using built-in Node.js modules.
 */

const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const dbPath = path.resolve(__dirname, '../../../birdfeeder.sqlite');
const db = new DatabaseSync(dbPath);

/**
 * Helper to create a scrypt hash from a password.
 * Must match the logic in authController.js
 */
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

const createDefaultUser = () => {
    const username = process.env.DEFAULT_ADMIN_USER || 'admin';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
    const hash = hashPassword(password);

    try {
        const insert = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
        insert.run(username, hash);
        console.log(`User "${username}" created with password from .env or default.`);
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            console.log(`User "${username}" already exists.`);
        } else {
            console.error('Error creating user:', err.message);
        }
    }
    // No explicit close needed for simple script with DatabaseSync, but good practice if it was a pool
};

createDefaultUser();
