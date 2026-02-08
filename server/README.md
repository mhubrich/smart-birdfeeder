# 🖥️ Server Documentation

The Backend API for the Smart Birdfeeder. It serves as the central hub for data persistence, authentication, and client communication.

## 📋 Project Overview
A Node.js/Express application that provides a REST API for the frontend and webhooks for the vision service. It manages a SQLite database for storing sightings and handles Web Push notifications to subscribed clients.

## 🛠️ Tech Stack
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: SQLite3 (persistent file-based)
*   **Security**: Helmet, CORS, BCrypt (password hashing)
*   **Notifications**: `web-push` (VAPID protocol)

## 📦 Core Modules

### 1. `app.js`
The application entry point. Configures middleware (CORS, Security, Body Parsing), session management, and static file serving.

### 2. `controllers/`
*   **`authController.js`**: Handles user sessions.
    *   `POST /auth/login`: Authenticates user.
    *   `GET /auth/me`: Validates session.
*   **`sightingController.js`**: CRUD operations for Bird Sightings.
    *   `notifySighting`: Webhook for Phase 1 (Detection). Triggers Push Notification.
    *   `updateSighting`: Webhook for Phase 2 (Recording Complete). Updates DB with video paths.

### 3. `services/`
*   **`pushService.js`**: Abstract wrapper for the `web-push` library. Handles VAPID key signing and sending payloads.
*   **`cleanupService.js`**: Background worker that monitors disk usage. Deletes oldest sightings when `MAX_DISK_USAGE_PERCENT` (from `settings.yaml`) is exceeded.

### 4. `db/`
*   **`database.js`**: SQLite connection and singleton instance.
*   **`seed.js`**: Utility to initialize the default admin user.

## �️ Database Schema

### `sightings` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key |
| `species` | TEXT | Bird species name |
| `reason` | TEXT | AI identification reason |
| `timestamp` | TEXT | ISO8601 creation time |
| `lq_crop_path` | TEXT | Path to the preview image |
| `hq_snapshot_path` | TEXT | Path to the high-res photo |
| `hq_video_path` | TEXT | Path to the MP4 recording |
| `status` | TEXT | `recording` or `ready` |

### `users` Table
Stores authentication data. Default user is created via `src/db/seed.js` using `DEFAULT_ADMIN_USER` and `DEFAULT_ADMIN_PASSWORD` from `.env`.

### `subscriptions` Table
Stores push notification endpoints for all registered devices.

## �🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/auth/login` | Login with `{username, password}` |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current user info |

### Sightings
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/sightings` | List recent sightings (Paginated) |
| PATCH | `/api/sightings/:id` | Update species/reason for a sighting |
| DELETE | `/api/sightings/:id` | Delete a sighting and its files |

### Webhooks (Internal)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/webhook/notify` | Create new detection record |
| POST | `/api/webhook/update` | Attach HQ assets to record |

## 🚀 Usage Guide

### Installation
```bash
cd server
npm install
```

### Database Setup
Initialize the database and create the default user. The credentials used for the admin user are defined by `DEFAULT_ADMIN_USER` and `DEFAULT_ADMIN_PASSWORD` in your `.env` file.

```bash
node src/db/seed.js
```

### Running the Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## 🧪 Testing
1.  **API Check**: Visit `http://localhost:3100/api/auth/me` (Should return 401 if not logged in).
2.  **Notification Check**: Use the Frontend "Bell" icon to test subscription.
