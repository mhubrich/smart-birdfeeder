/**
 * @module Seed
 * @description Utility script to seed the database.
 */

const path = require('path');
// Load ENV before anything else
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const db = require('./database');
const crypto = require('node:crypto');

const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

const createDefaultUser = () => {
    const username = process.env.DEFAULT_ADMIN_USER || 'admin';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
    const hash = hashPassword(password);

    console.log(`Attempting to seed user: ${username}`);

    try {
        const insert = db.prepare('INSERT OR REPLACE INTO users (username, password_hash) VALUES (?, ?)');
        insert.run(username, hash);
        console.log(`User "${username}" initialized/updated successfully.`);
    } catch (err) {
        console.error('Error seeding user:', err.message);
    }
};

createDefaultUser();
