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
*   Calculates sunrise/sunset based on location to manage **Smart Hibernation**.
*   Automatically releases camera connections and sleeps until dawn to conserve power, network bandwidth, and hardware longevity.
*   **Deep Monitoring**: Automatically reduces polling frequency during inactive periods to save CPU and reduce heat.
*   **Motion Verification**: Requires N consecutive frames of motion before triggering the AI, effectively filtering out "ghost" motion like wind or light shifts.
*   Coordinates the flow: Detect Motion -> Classify -> Notify -> Record -> Update.

### 2. `motion_detector.py`
Handles the "Low Quality" (LQ) stream analysis.
*   **Algorithm**: Uses MOG2 (Mixture of Gaussians) for background subtraction.
*   **Smart Crop**: robustly calculates bounding boxes around moving objects to minimize the data sent to the AI.
*   **Monitoring**: Runs at a configurable interval (`MOTION_CHECK_INTERVAL_MS`) and uses frame downscaling (`MOTION_ANALYSIS_WIDTH`) to minimize CPU usage while maintaining responsiveness.
*   **Dynamic Buffer Flushing**: Automatically calculates how many frames to "grab and discard" based on the time since the last read and current FPS. This eliminates stream "lag" after processing pauses or cooldowns.
*   **Smart Reconnect**: Detects if the backlog is too large (> 10 seconds) and automatically re-establishes the camera connection instead of flushing, ensuring the system quickly catches up to real-time.
*   **In-Memory Analysis**: Encodes motion crops directly into JPEG bytes in memory to avoid all Disk I/O (including RAM disks) during AI identification, maximizing speed and hardware longevity. Tiny temporary files are no longer written to disk.

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
| `MOTION_THRESHOLD` | Sensitivity of background subtraction (Lower = More Sensitive) | `100` |
| `MIN_AREA_PIXELS` | Minimum size of object to trigger detection | `10000` |
| `MOTION_CHECK_INTERVAL_MS` | Milliseconds to wait between frame checks (saves CPU) | `500` |
| `MOTION_ANALYSIS_WIDTH` | Width to resize frames to for motion detection (saves CPU) | `480` |
| `CAMERA_FPS_FALLBACK` | Default FPS to assume if the camera doesn't report it (used for dynamic flushing) | `25` |
| `SIGHTING_COOLDOWN_MINUTES` | Time to wait before notifying for the same bird again | `1.5` |
| `ANALYSIS_COOLDOWN_SECONDS` | Minimum seconds between AI analysis calls (prevents rapid-fire API usage) | `10` |
| `Smart Hibernation` | (Internal) Calculates exact seconds until sunrise to sleep efficiently | `Enabled` |
| `Deep Monitoring` | Reduces polling frequency to 2s if no activity for 5 mins | `Enabled` |
| `Motion Verification` | Requires `MOTION_VERIFICATION_FRAMES` consecutive detections | `Enabled` |

## 🚀 Usage Guide

### Prerequisites
*   **Python**: 3.9+ 
*   **FFmpeg**: Required for RTSP stream handling.
    ```bash
    sudo apt install ffmpeg
    ```
*   **System Libraries (Raspberry Pi only)**: Essential for stable `numpy` and `opencv` on ARM.
    ```bash
    sudo apt update
    sudo apt install -y python3-dev python3-opencv
    ```

### Installation

To ensure stability on the Raspberry Pi, we use the system-provided OpenCV and NumPy libraries.

1.  **Navigate to the vision directory**:
    ```bash
    cd vision
    ```

2.  **Create a virtual environment with system access**:
    ```bash
    # This allows the venv to use the 'python3-opencv' installed via apt
    python3 -m venv venv --system-site-packages
    source venv/bin/activate
    ```

3.  **Install remaining dependencies**:
    ```bash
    # Update pip and install the lightweight requirements
    pip install --upgrade pip
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
