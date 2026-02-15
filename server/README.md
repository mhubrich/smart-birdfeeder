# 🖥️ Server Documentation

The Backend API for the Smart Birdfeeder. It serves as the central hub for data persistence, authentication, and client communication.

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
*   **UX**: Triggers a **Web Push Notification** to all subscribed devices.
*   **Payload**: `species`, `reason`, `lq_crop_path`, `timestamp`.

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
*   **`cleanupService.js`**: Background worker that monitors disk usage. Automatically purges the oldest sightings when `MAX_DISK_USAGE_PERCENT` (configured in `settings.yaml`) is exceeded.

## 🔌 API Summary

### Authentication
*   `POST /api/auth/login`: `{username, password}` -> Sets session cookie.
*   `GET /api/auth/me`: Returns current user metadata.

### Sightings
*   `GET /api/sightings`: paginated list of all recorded sightings.
*   `PATCH /api/sightings/:id`: Manually correct species/reason from the UI.
*   `DELETE /api/sightings/:id`: Purges database entry and associated media files.

## 🚀 Getting Started

1.  **Install dependencies**:
    ```bash
    cd server && npm install
    ```
2.  **Initialize Database**:
    Ensures `birdfeeder.sqlite` exists and creates the admin account.
    ```bash
    node src/db/seed.js
    ```
3.  **Launch**:
    ```bash
    npm run dev
    ```

## 🧪 Verification
1.  **Auth Check**: Visit `/api/auth/me` to ensure endpoint resilience.
2.  **Webhook Simulation**:
    ```bash
    curl -X POST http://localhost:3100/api/webhook/notify -H "Content-Type: application/json" \
    -d '{"species": "Test Bird", "reason": "Doc test", "timestamp": "2024-01-01T00:00:00"}'
    ```
