# 🐦 Smart Birdfeeder

A professional-grade, AI-powered bird monitoring system designed for the Raspberry Pi. This dual-stream system captures 2K video while using lightweight AI models for real-time species identification, featuring a bold and energetic **Playful Geometric** interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-v22.5+-green.svg)
![Python](https://img.shields.io/badge/python-3.9+-yellow.svg)
![Design](https://img.shields.io/badge/Design-Playful--Geometric-8B5CF6.svg)

---

## 📖 Project Overview

The Smart Birdfeeder solves the problem of "missing the moment" with nature photography. By constantly monitoring a video stream and using advanced AI to filter out false positives (leaves, shadows), it autonomously curates a collection of high-quality bird videos.

### Key Features
*   **🤖 AI Ornithologist**: Identifies bird species using Google Gemini 2.5 Flash with scientific precision.
*   **🎨 Playful Geometric UI**: A high-energy dashboard built with bold borders, hard shadows, and a vibrant color palette.
*   **📹 Dual-Stream Architecture**: 
    *   **Low Quality Stream**: Analyzed for motion at high frequency.
    *   **High Quality Stream**: Recorded directly to disk in 2K resolution.
*   **🔔 Real-time Notifications**: Web Push alerts delivered to your devices within seconds of identification.
*   **🧹 Smart Storage**: Automated file cleanup based on configurable disk usage thresholds.
*   **📱 Native-Like PWA**: Fast, installable app experience for iOS and Android.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Vision** | Python, OpenCV (System), Gemini | Motion detection and AI Analysis |
| **Backend** | Node.js (v22 Native Modules) | API, Persistence (SQLite), and Push |
| **Frontend** | React 18, Vite, Tailwind v4 | Responsive PWA dashboard |
| **Design** | Playful Geometric | Bold borders, hard shadows, Outfit font |

---

## ✨ Design Aesthetics (New!)

The system features a **Playful Geometric** design system that prioritizes clarity and tactile energy:
*   **Bold Contrast**: Every card and button uses a `2px` foreground border for a sharp, distinct silhouette.
*   **Hard Geometric Shadows**: Real-world tactile feeling using offset solid shadows (`shadow-pop`).
*   **Vibrant Palette**: Uses `Indigo-600` primary accents combined with playful pinks and golden yellows.
*   **Tactile Feedback**: Interactive elements scale and shift on hover and click, mirroring the "pop" of the visuals.
*   **Instagram-Style Media**: Rich cards with a `4:5` aspect ratio specifically chosen for avian photography.

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
MOTION_THRESHOLD: 100       # Lower = More sensitive
MIN_AREA_PIXELS: 10000     # Size of object to track
MOTION_CHECK_INTERVAL_MS: 500 # How often to read/check frames
MOTION_ANALYSIS_WIDTH: 480  # Downscale frame for faster detection
BUFFER_FLUSH_COUNT: 5       # Keep stream live after sleep

# Storage
MAX_DISK_USAGE_PERCENT: 90 # Auto-delete oldest files if exceeded
VIDEO_DURATION_SECONDS: 30 # Length of HQ recording

# Advanced
SIGHTING_COOLDOWN_MINUTES: 1.5 # Anti-spam
ANALYSIS_COOLDOWN_SECONDS: 10 # Rate limit for AI calls
```

---

## 🚀 Installation & Usage

### 1. Prerequisites
*   **Hardware**: Raspberry Pi 3B+ / 4 / 5 or any Linux/Mac host.
*   **Node.js**: v22.5+ (Required for built-in `node:sqlite`).
*   **Python**: 3.9+.
*   **System Tools**: `ffmpeg` (for recording) and `python3-opencv` (for vision).
    ```bash
    # On Raspberry Pi / Debian:
    sudo apt update
    sudo apt install ffmpeg python3-dev python3-opencv
    ```

### 2. Environment Setup
Create a `.env` file in the root directory (copy from `.env.example`):
```properties
GEMINI_API_KEY=your_key
RTSP_URL_LQ=rtsp://...
RTSP_URL_HQ=rtsp://...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
# ... see .env.example for more
```

### 3. Quick Start (Development)

**Terminal 1: Server (Node.js)**
```bash
cd server
npm install
node src/db/seed.js # Create admin user
npm run dev
```

**Terminal 2: Client (React)**
```bash
cd client
npm install
npm run dev
```

**Terminal 3: Vision (Python)**
```bash
cd vision
# Create venv with access to system OpenCV/NumPy
python3 -m venv venv --system-site-packages
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
