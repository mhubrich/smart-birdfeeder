/**
 * @module SQLiteSessionStore
 * @description A custom express-session store that uses the project's existing node:sqlite connection.
 * Follows the Separation of Concerns principle by keeping DB interaction for sessions isolated.
 */

const session = require('express-session');

class SQLiteSessionStore extends session.Store {
    /**
     * @param {object} db - The DatabaseSync instance from node:sqlite.
     */
    constructor(db) {
        super();
        this.db = db;

        // Ensure the sessions table exists.
        // sid: session id
        // sess: stringified JSON session data
        // expire: unix timestamp in seconds
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                sid TEXT PRIMARY KEY,
                sess TEXT NOT NULL,
                expire INTEGER NOT NULL
            )
        `);
    }

    /**
     * Gets the expiration time from the session object.
     * @param {object} sess 
     * @returns {number} Unix timestamp in seconds
     */
    _getExpire(sess) {
        if (sess && sess.cookie && sess.cookie.expires) {
            return Math.floor(new Date(sess.cookie.expires).getTime() / 1000);
        }
        // Fallback to 1 day from now if no expiration is provided
        return Math.floor(Date.now() / 1000) + 86400;
    }

    /**
     * Retrieves a session by its ID.
     */
    get(sid, cb) {
        try {
            const row = this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expire > ?').get(sid, Math.floor(Date.now() / 1000));
            if (!row) return cb(null, null);
            cb(null, JSON.parse(row.sess));
        } catch (err) {
            cb(err);
        }
    }

    /**
     * Upserts a session.
     */
    set(sid, sess, cb) {
        try {
            const expire = this._getExpire(sess);
            const stmt = this.db.prepare(`
                INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, ?)
                ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire
            `);
            stmt.run(sid, JSON.stringify(sess), expire);
            cb(null);
        } catch (err) {
            cb(err);
        }
    }

    /**
     * Destroys a session.
     */
    destroy(sid, cb) {
        try {
            this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
            cb(null);
        } catch (err) {
            cb(err);
        }
    }

    /**
     * Refreshes the expiration time of a session.
     */
    touch(sid, sess, cb) {
        try {
            const expire = this._getExpire(sess);
            this.db.prepare('UPDATE sessions SET expire = ? WHERE sid = ?').run(expire, sid);
            cb(null);
        } catch (err) {
            cb(err);
        }
    }

    /**
     * Clears all sessions.
     */
    clear(cb) {
        try {
            this.db.exec('DELETE FROM sessions');
            cb(null);
        } catch (err) {
            cb(err);
        }
    }
}

module.exports = SQLiteSessionStore;
