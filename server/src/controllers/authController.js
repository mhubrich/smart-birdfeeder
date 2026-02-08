/**
 * @module AuthController
 * @description Handles user authentication (login, logout, registration) and session management.
 */

const bcrypt = require('bcrypt');
const db = require('../db/database');

exports.login = (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

        req.session.userId = user.id;
        res.json({ message: 'Logged in' });
    });
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
};

exports.me = (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Not logged in' });

    db.get('SELECT id, username FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (!user) return res.status(401).json({ message: 'User not found' });
        res.json(user);
    });
};

// Only for initial setup - remove or protect in production
exports.register = async (req, res) => {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User created' });
    });
};
