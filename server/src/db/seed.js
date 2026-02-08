/**
 * @module Seed
 * @description Utility script to seed the database with initial data (e.g., default admin user).
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const dbPath = path.resolve(__dirname, '../../../birdfeeder.sqlite');
const db = new sqlite3.Database(dbPath);

const createDefaultUser = async () => {
    const username = process.env.DEFAULT_ADMIN_USER || 'admin';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
    const hash = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                console.log('User "admin" already exists.');
            } else {
                console.error('Error creating user:', err.message);
            }
        } else {
            console.log('User "admin" created with password "admin".');
        }
        db.close();
    });
};

createDefaultUser();
