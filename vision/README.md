# 👁️ Vision Service Documentation

The Vision Service is the "Brain" of the Smart Birdfeeder system. It handles real-time video analysis, object detection, AI classification, and high-quality recording orchestration on the Raspberry Pi.

## 📋 Project Overview
This service connects to an RTSP camera stream, detects motion using computer vision, identifies birds using Generative AI (Google Gemini), and manages disk storage for recordings. It is designed to run efficiently on low-power ARM devices like the Raspberry Pi 3B+.

## 🛠️ Tech Stack
*   **Language**: Python 3.9+
*   **Computer Vision**: OpenCV (`opencv-python-headless`) - Background Subtraction (MOG2)
*   **AI Model**: Google Gemini 2.0 Flash via `google-genai` SDK
*   **Multimedia**: FFmpeg (via `subprocess`) for RTSP stream handling and recording
*   **Scheduling**: `suntime` for day/night cycle management

## 📦 Core Modules

### 1. `main.py`
The entry point and orchestrator. It runs the main event loop:
*   Initializes all sub-modules.
*   Checks for daylight to pause operations at night.
*   Coordinates the flow: Detect Motion -> Classify -> Notify -> Record -> Update.

### 2. `motion_detector.py`
Handles the "Low Quality" (LQ) stream analysis.
*   **Algorithm**: Uses MOG2 (Mixture of Gaussians) for background subtraction.
*   **Smart Crop**: robustly calculates bounding boxes around moving objects to minimize the data sent to the AI.
*   **Throttling**: Skips frames based on `ANALYSIS_FRAME_SKIP` to save CPU.

### 3. `gemini_client.py`
Interface for Google's Gemini API.
*   **Prompt Engineering**: Acts as an expert ornithologist to identify species.
*   **Error Handling**: Manages API timeouts and JSON parsing errors.
*   **Cost Efficiency**: Uses the "Flash" model variant for speed and low cost.

### 4. `recorder.py`
Manages the "High Quality" (HQ) stream.
*   **Zero-Copy Recording**: Uses FFmpeg's `-c:v copy` to dump the RTSP stream directly to disk without re-encoding, ensuring minimal CPU usage.
*   **Snapshots**: Extracts high-quality frames for thumbnails.

## ⚙️ Configuration
The service uses a two-tier configuration system:
1.  **`config/settings.yaml`**: Behavioral parameters (thresholds, cooldowns, durations).
2.  **`.env`**: Environmental context (locations, API keys, stream URLs).

### Behavioral Settings (`settings.yaml`)

| Setting | Description | Default |
| :--- | :--- | :--- |
| `MOTION_THRESHOLD` | Sensitivity of background subtraction (Lower = More Sensitive) | `25` |
| `MIN_AREA_PIXELS` | Minimum size of object to trigger detection | `500` |
| `ANALYSIS_FRAME_SKIP` | Frames to skip between analysis checks (FPS divisor) | `6` |
| `SIGHTING_COOLDOWN_MINUTES` | Time to wait before notifying for the same bird again | `1.5` |
| `ANALYSIS_COOLDOWN_SECONDS` | Minimum seconds between AI analysis calls (prevents rapid-fire API usage) | `10` |

## 🚀 Usage Guide

### prerequisites
*   Python 3.9+
*   FFmpeg installed on the system (`sudo apt install ffmpeg`)
*   Virtual environment set up

### Installation
```bash
cd vision
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Running the Service
```bash
# Ensure .env is populated in the project root
source venv/bin/activate
python3 main.py
```

### Verification
You should see logs indicating connection to the RTSP stream:
```
INFO - Connecting to RTSP stream...
INFO - Motion detected! Analyzing...
INFO - Gemini identified: Northern Cardinal
```

## 🧪 Testing
Currently, the project relies on manual verification.
1.  **Motion Test**: Wave a hand in front of the camera. Verify "Motion detected" log.
2.  **AI Test**: Show a picture of a bird to the camera. Verify "Gemini identified" log.
3.  **Recording Test**: Check `../static/captures/` for `.mp4` files.
