# 🐦 Smart Birdfeeder

A professional-grade, AI-powered bird monitoring system designed for the Raspberry Pi. This dual-stream system captures 2K video while using lightweight AI models for real-time species identification, now with a stunning Material You frontend.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-v18+-green.svg)
![Python](https://img.shields.io/badge/python-3.9+-yellow.svg)
![Design](https://img.shields.io/badge/Design-Material--You--v3-6750A4.svg)

---

## 📖 Project Overview

The Smart Birdfeeder solves the problem of "missing the moment" with nature photography. By constantly monitoring a video stream and using advanced AI to filter out false positives (leaves, shadows), it autonomously curates a collection of high-quality bird videos.

### Key Features
*   **🤖 AI Ornithologist**: Identifies bird species using Google Gemini 2.0 Flash along with a descriptive reason.
*   **🎨 Material You Interface**: A premium, "Instagram-style" dashboard built with MD3 design tokens, theme personalization, and rich micro-interactions.
*   **📹 Dual-Stream Architecture**:
    *   **Low Quality Stream**: Analyzed for motion (CPU efficient).
    *   **High Quality Stream**: Recorded directly to disk (Zero-Copy).
*   **🔔 Real-time Notifications**: Web Push notifications to your phone within seconds of a landing.
*   **🧹 Self-Managing**: Auto-deletes old footage when disk space runs low.
*   **📱 Native-Like PWA**: Installable app for iOS and Android with offline support.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Vision** | Python, OpenCV, Gemini | Motion detection and Image Analysis |
| **Backend** | Node.js, Express, SQLite | API, storage, and push services |
| **Frontend** | React, Vite, Tailwind v4 | Responsive PWA dashboard with MD3 |
| **Aesthetics** | Material You (MD3) | Purple seed palette with glassmorphism |

---

## ✨ Design Aesthetics (New!)

The system features a state-of-the-art **Material You (MD3)** design system:
*   **Purple Tonal Palette**: Uses a primary seed color (#6750A4) for a cohesive and friendly look.
*   **Tactile Feedback**: Hover scale-ups (`1.01x`) and active scale-downs (`0.99x`) on all interactive cards.
*   **Atmospheric Depth**: Background blur shapes and glassmorphism headers for a premium feel.
*   **Responsive Cards**: Instagram-style media carousels with 4:5 aspect ratios optimized for mobile.

---

## 📂 Core Modules

*   **`/vision`**: The python service running on the Raspberry Pi. Contains the `MotionDetector`, `Recorder`, and `GeminiClient`.
*   **`/server`**: The Node.js API. Handles the `sightings` database, serves the frontend, and manages push subscriptions.
*   **`/client`**: The React source code for the PWA dashboard.

---

## ⚙️ Configuration

System-wide behavioral settings are managed in `config/settings.yaml`, while deployment-specific secrets and location context are stored in `.env`.

```yaml
# Motion Detection
MOTION_THRESHOLD: 25        # Lower = More sensitive
MIN_AREA_PIXELS: 500       # Size of object to track

# Storage
MAX_DISK_USAGE_PERCENT: 80 # Auto-delete oldest files if exceeded
VIDEO_DURATION_SECONDS: 30 # Length of HQ recording

# Advanced
SIGHTING_COOLDOWN_MINUTES: 1.5 # Anti-spam
ANALYSIS_COOLDOWN_SECONDS: 10 # Rate limit for AI calls
```

---

## 🚀 Installation & Usage

### 1. Prerequisites
*   Raspberry Pi 3B+ or 4 (or any Linux/Mac host)
*   Node.js v18+
*   Python 3.9+
*   FFmpeg (`sudo apt install ffmpeg`)

### 2. Environment Setup
Create a `.env` file in the root directory:
```properties
GEMINI_API_KEY=your_key
RTSP_URL_LQ=rtsp://...
RTSP_URL_HQ=rtsp://...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
SESSION_SECRET=...
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASSWORD=admin

# Location & AI Context
LOCATION_LAT=40.7128
LOCATION_LNG=-74.0060
LOCATION_NAME=New York, NY, USA
FEEDER_SETTING=Garden with a bird feeder
```

---

## 🔑 Environment Variables

| Variable | Description | Source | Default |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio Key | [aistudio.google.com](https://aistudio.google.com/) | - |
| `RTSP_URL_LQ` | Low-quality stream URL | Camera Settings | - |
| `RTSP_URL_HQ` | High-quality stream URL | Camera Settings | - |
| `VAPID_PUBLIC_KEY` | Public key for push | `npx web-push` | - |
| `VAPID_PRIVATE_KEY`| Private key for push | `npx web-push` | - |
| `SESSION_SECRET` | Secret for auth sessions| Random string | - |
| `DEFAULT_ADMIN_USER` | Initial admin username | Custom | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin password| Custom | `admin` |
| `KEEP_LQ_SNAPSHOTS` | Keep non-bird motion images | Boolean | `false` |
| `LOCATION_LAT` | Latitude for suntime calculation | Decimal | `40.7128` |
| `LOCATION_LNG` | Longitude for suntime calculation | Decimal | `-74.0060` |
| `LOCATION_NAME` | Display name of the location | String | `New York, NY, USA` |
| `FEEDER_SETTING` | Description of the feeder environment| String | `Garden with a bird feeder`|

---

### 3. Quick Start (Development)

**Terminal 1: Server**
```bash
cd server && npm install
node src/db/seed.js # Run once to create admin user
npm run dev
```

**Terminal 2: Client**
```bash
cd client && npm install
npm run dev
```

**Terminal 3: Vision**
```bash
cd vision && python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 4. How to Run Tests
This project uses manual verification steps:
1.  **Default Login:**
- **User:** `admin` (or `DEFAULT_ADMIN_USER`)
- **Pass:** `admin` (or `DEFAULT_ADMIN_PASSWORD`)
2.  **Unit Logic**: Check logs in `vision/` for "Motion detected" events.
3.  **Integration**: Verify that a new row appears in `birdfeeder.sqlite` after a detection.
4.  **End-to-End**: Ensure the PWA updates with the new MD3 card and the notification is received.

---

## 🤝 Contribution Guidelines
1.  **Branching**: Use `feature/name` or `fix/name`.
2.  **Aesthetics**: Follow the Material You design patterns defined in `client/src/index.css`.
3.  **Comments**: Ensure all new files have block headers and JSDoc/Docstrings as per `MEMORY[commenting-guidelines.md]`.
4.  **Linting**: Ensure code is clean and follows the Separation of Concerns (SoC) principle.

---

## 🔌 API Endpoints Summary

*   `GET /api/sightings`: JSON list of all birds.
*   `PATCH /api/sightings/:id`: Update sighting metadata (species, reason).
*   `DELETE /api/sightings/:id`: Remove a sighting.
*   `POST /api/webhook/notify`: Internal webhook for new detections.
*   `POST /api/auth/login`: User Session management.

See `server/README.md` for full API documentation.
