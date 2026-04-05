# 🖥️ Server Documentation

The Backend API for Raspberry Bird. It serves as the central hub for data persistence, authentication, and client communication.

## 📋 Project Overview
A Node.js/Express application that provides a REST API for the frontend and webhooks for the vision service. It leverages the latest **Node.js Native Modules** (`node:sqlite`, `node:crypto`) to ensure stability and performance on Raspberry Pi without the need for external native dependencies.

## 🛠️ Tech Stack
*   **Runtime**: Node.js (v22.5+)
*   **Framework**: Express.js
*   **Database**: Built-in `node:sqlite` (`DatabaseSync` for synchronous reliable writes)
*   **Security**: `node:crypto` (scrypt for password hashing), Helmet, CORS
*   **Notifications**: `web-push` (VAPID protocol)
*   **Storage**: Direct filesystem management with automated cleanup service

## 🏗️ Architecture: Dual-Phase Notifications

The server uses a two-phase webhook system to provide instantaneous feedback to the user while managing high-bandwidth video transfers.

### Phase 1: Detection (`/api/webhook/notify`)
Triggered immediately when Gemini identifies a bird.
*   **Action**: Creates a new DB record with `status: 'recording'`.
*   **UX**: Triggers a **Web Push Notification** to all subscribed devices (using app icon as placeholder).
*   **Payload**: `species`, `reason`, `timestamp`, `motion_x`, `motion_y`.

### Phase 2: Completion (`/api/webhook/update`)
Triggered after the High-Quality (HQ) video and snapshot are saved to disk.
*   **Action**: Updates the DB record to `status: 'ready'`.
*   **UX**: The sighting card in the PWA automatically updates from a "Processing" state to show the high-quality assets.
*   **Payload**: `original_timestamp` (used for matching), `hq_snapshot_path`, `hq_video_path`.

## 📦 Core Modules

### 1. `app.js`
The application entry point. Configures middleware, session management, and serves the PWA frontend.

### 2. `controllers/`
*   **`authController.js`**: Manages user authentication and session validation.
*   **`sightingController.js`**: Orchestrates the bird observation lifecycle, database updates, and push notifications.

### 3. `services/`
*   **`pushService.js`**: Manages VAPID subscriptions and delivery of notifications.
*   **`cleanupService.js`**: Background worker that monitors disk usage. Automatically purges the oldest sightings when `MAX_DISK_USAGE_PERCENT` (configured in `settings.yaml`) is exceeded. Also cleans up expired sessions and stale web push subscriptions every hour.

### Authentication & Access
*   `POST /api/auth/login`: `{username, password}` -> Sets persistent session cookie (60 days).
*   `GET /api/auth/me`: Returns current user metadata.
*   `GET /api/config`: Returns VAPID public key (Requires Session).
*   `POST /api/subscribe`: Saves web push subscription (Requires Session).

### Sightings
*   `GET /api/sightings`: Paginated list of sightings (supports `?limit=` and `?offset=`). Each record includes a `sightings_count` property indicating total sightings of that species (Requires Session).
*   `PATCH /api/sightings/:id`: Update sighting metadata (e.g., `species`, `reason`) (Requires Session).
*   `DELETE /api/sightings/:id`: Purges entry and media (Requires Session).

### Vision Webhooks (M2M)
*   `POST /api/webhook/notify`: Start detection record (Requires `X-API-Key`).
*   `POST /api/webhook/update`: Finalize assets (Requires `X-API-Key`).
*   `POST /api/webhook/heartbeat`: Report service health (Requires `X-API-Key`).

### System Health
*   `GET /api/system-status`: Check Vision Service availability (Requires Session).

## 🗄️ Persistence & Session Management

The server implements a **Persistent Session System** to ensure a seamless experience on mobile and desktop:
*   **Duration**: Sessions remain active for **60 days**, even if the browser is closed.
*   **Storage**: Handled by a custom `SQLiteSessionStore` (in `src/db/sessionStore.js`) that uses the same `birdfeeder.sqlite` database as the rest of the application.
*   **Robustness**: Logins survive Raspberry Pi reboots and server restarts.
*   **Security**: Uses `SESSION_SECRET` from `.env` and sets `secure: true` in production environments.


## 🛡️ Production & Proxy Configuration

The server is designed to run securely behind a reverse proxy (like Nginx or Cloudflare Tunnel).

### Trust Proxy
Current configuration uses `app.set('trust proxy', 1)`. This is required for:
- Correct IP logging.
- Determining if the request is secure (HTTPS).
- Setting `secure: true` on session cookies.

### Cloudflare Support
- **CSP**: The `helmet` middleware is pre-configured to allow Cloudflare Insights scripts (`https://static.cloudflareinsights.com`).
- **Sub-paths**: Express handles mounts for both root and `/bird` paths to ensure compatibility with tunnel path-mapping.

## 🚀 Getting Started


1.  **Install dependencies**:
    ```bash
    cd server && npm install
    ```
2.  **Initialize Database**:
    Ensures `birdfeeder.sqlite` exists and creates the admin account using credentials from `.env`.
    ```bash
    npm run seed
    ```
3.  **Launch**:
    ```bash
    npm run dev
    ```

## 🧪 Verification
1.  **Auth Check**: Visit `/api/auth/me` to ensure endpoint resilience.
2.  **Webhook Simulation**:
    ```bash
    curl -X POST http://localhost:3100/api/webhook/notify \
    -H "Content-Type: application/json" \
    -H "X-API-Key: your_internal_api_key_here" \
    -d '{"species": "Test Bird", "reason": "Doc test", "timestamp": "2024-01-01T00:00:00", "motion_x": 50, "motion_y": 50}'
    ```
