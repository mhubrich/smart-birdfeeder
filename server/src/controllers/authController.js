/**
 * @module AuthController
 * @description Handles user authentication using Node.js built-in node:crypto and node:sqlite.
 */

const crypto = require('node:crypto');
const db = require('../db/database');

/**
 * Helper to verify a password against a stored scrypt hash.
 * @param {string} password - The plain-text password.
 * @param {string} storedHash - The hash stored in the DB (format: salt:hash).
 * @returns {boolean}
 */
const verifyPassword = (password, storedHash) => {
    try {
        const [salt, hash] = storedHash.split(':');
        // Using scryptSync for simplicity and consistency with DatabaseSync
        const key = crypto.scryptSync(password, salt, 64).toString('hex');
        return hash === key;
    } catch (err) {
        return false;
    }
};

/**
 * Helper to create a scrypt hash from a password.
 * @param {string} password - The plain-text password.
 * @returns {string} - The stored hash (format: salt:hash).
 */
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

exports.login = (req, res) => {
    try {
        const { username, password } = req.body;

        const query = db.prepare('SELECT * FROM users WHERE username = ?');
        const user = query.get(username);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!verifyPassword(password, user.password_hash)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        req.session.userId = user.id;
        res.json({ message: 'Logged in' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
};

exports.me = (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Not logged in' });
        }

        const query = db.prepare('SELECT id, username FROM users WHERE id = ?');
        const user = query.get(req.session.userId);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
};

