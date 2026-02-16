# -----------------------------------------------------------------------------
# Module: Main Service
# Purpose: Orchestrates the Vision Service, managing motion detection, AI analysis, and recording.
# -----------------------------------------------------------------------------

import os
import time
import yaml
import logging
import threading
import datetime
import requests
import gc
from dotenv import load_dotenv
from suntime import Sun
from pathlib import Path

from motion_detector import MotionDetector
from gemini_client import GeminiClient
from recorder import Recorder
from csv_logger import CSVHandler
import cv2

# Load environment variables
load_dotenv(dotenv_path="../.env")

# Logging setup
csv_log_path = os.path.join("../static", "vision_log.csv")
csv_handler = CSVHandler(csv_log_path)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        csv_handler
    ]
)
logger = logging.getLogger("BirdFeederVision")

# Configuration
def load_config():
    with open("../config/settings.yaml", "r") as f:
        return yaml.safe_load(f)

CONFIG = load_config()

# Global State
LAST_SIGHTING_TIME = 0
LAST_ANALYSIS_TIME = 0
LAST_MOTION_TIME = time.time()
SIGHTING_COOLDOWN = CONFIG.get('SIGHTING_COOLDOWN_MINUTES', 5) * 60
ANALYSIS_COOLDOWN = CONFIG.get('ANALYSIS_COOLDOWN_SECONDS', 30)
COOLDOWN_ACTIVE = False
DEEP_SLEEP_ACTIVE = False
MOTION_CONSECUTIVE_COUNT = 0

# Sun Tracking Cache
SUN_DATA = {
    "sunrise": None,
    "sunset": None,
    "tomorrow_sunrise": None,
    "date": None
}

# Components
motion_detector = MotionDetector(os.getenv("RTSP_URL_LQ"), CONFIG)
gemini_client = GeminiClient(os.getenv("GEMINI_API_KEY"))
recorder = Recorder(os.getenv("RTSP_URL_HQ"), CONFIG)
backend_url = f"http://localhost:{os.getenv('PORT', 3100)}/api"
API_KEY = os.getenv("INTERNAL_API_KEY")

def check_daylight():
    """
    Checks if it is currently daylight at the configured location.
    Uses a global cache to avoid recalculating sun position on every loop.

    Returns:
        tuple: (bool is_daylight, float seconds_until_sunrise)
    """
    global SUN_DATA
    now = datetime.datetime.now().astimezone()
    today = now.date()

    try:
        # Refresh cache if it's a new day or first run
        if SUN_DATA["date"] != today:
            lat = float(os.getenv("LOCATION_LAT", 40.7128))
            lng = float(os.getenv("LOCATION_LNG", -74.0060))
            sun = Sun(lat, lng)
            
            # get_sunrise_time returns UTC aware datetime; .astimezone() converts to local
            # We pass 'now' (a datetime object) because the library's internal utcoffset() 
            # call requires a datetime instance, not just a date.
            SUN_DATA["sunrise"] = sun.get_sunrise_time(at_date=now).astimezone()
            SUN_DATA["sunset"] = sun.get_sunset_time(at_date=now).astimezone()
            
            # Pre-cache tomorrow's sunrise to avoid recalculation at night
            tomorrow_dt = now + datetime.timedelta(days=1)
            SUN_DATA["tomorrow_sunrise"] = sun.get_sunrise_time(at_date=tomorrow_dt).astimezone()
            
            SUN_DATA["date"] = today
            logger.info(f"Sun times cached for {today}: Sunrise {SUN_DATA['sunrise'].strftime('%I:%M %p')}, Sunset {SUN_DATA['sunset'].strftime('%I:%M %p')}")

        sunrise = SUN_DATA["sunrise"]
        sunset = SUN_DATA["sunset"]

        # In regions with polar day or night, the library may return identical times or logically inverted ones.
        # We default to True (daylight) to ensure the service stays active in these edge cases.
        if sunrise >= sunset:
            return True, 0
            
        # Check if it's currently daylight
        if sunrise < now < sunset:
            return True, 0
            
        # Determine seconds until the next sunrise
        if now < sunrise:
            # It's currently early morning (before today's sunrise)
            sleep_sec = (sunrise - now).total_seconds()
        else:
            # It's evening (after today's sunset). Next sunrise is tomorrow (pre-cached).
            next_sunrise = SUN_DATA["tomorrow_sunrise"]
            sleep_sec = (next_sunrise - now).total_seconds()
            
        return False, sleep_sec

    except Exception as e:
        logger.warning(f"Suntime calculation failed: {e}. Defaulting to True.")
        return True, 0

def handle_sighting(species_data, capture_process, hq_video_path, hq_snap_path, timestamp):
    """
    Handles the sequence of actions when a bird is confirmed.
    Runs in a separate thread to wait for recording to finish without blocking main loop.

    Args:
        species_data (dict): The identification results from Gemini.
        capture_process (subprocess.Popen): The already-running FFmpeg process.
        hq_video_path (str): Path where the video is being saved.
        hq_snap_path (str): Path where the snapshot is being saved.
        timestamp (str): The original ISO timestamp of the sighting.
    """
    global LAST_SIGHTING_TIME
    LAST_SIGHTING_TIME = time.time()
    
    species = species_data.get('species', 'Unknown')
    reason = species_data.get('identification_reason', 'Detected by AI')
    
    # Phase 1: Notify Backend
    payload = {
        "status": "recording",
        "species": species,
        "reason": reason,
        "timestamp": timestamp
    }
    
    try:
        logger.info(f"Sending Phase 1 Notification: {species}")
        requests.post(f"{backend_url}/webhook/notify", json=payload, headers={"X-API-Key": API_KEY})
    except Exception as e:
        logger.error(f"Failed to send Phase 1 notification: {e}")

    # Phase 2: Wait for recording to complete
    duration = CONFIG.get('VIDEO_DURATION_SECONDS', 30)
    success = recorder.wait_for_capture(capture_process, duration)
    
    if success:
        # Send Phase 2 Update
        update_payload = {
            "original_timestamp": timestamp,
            "status": "ready",
            "hq_snapshot_path": os.path.relpath(hq_snap_path, "../static"),
            "hq_video_path": os.path.relpath(hq_video_path, "../static")
        }
        
        try:
            logger.info("Sending Phase 2 Update")
            requests.post(f"{backend_url}/webhook/update", json=update_payload, headers={"X-API-Key": API_KEY})
        except Exception as e:
            logger.error(f"Failed to send Phase 2 update: {e}")
    else:
        logger.error("Speculative capture failed or timed out. Skipping Phase 2 update.")
        
    # Cleanup memory
    gc.collect()

def main():
    global LAST_ANALYSIS_TIME, LAST_MOTION_TIME, COOLDOWN_ACTIVE, DEEP_SLEEP_ACTIVE, MOTION_CONSECUTIVE_COUNT
    logger.info("Starting Vision Service...")
    
    # Create capture directory
    Path("../static/captures").mkdir(parents=True, exist_ok=True)
    
    if not motion_detector.connect():
        logger.error("Could not connect to LQ Stream. Exiting.")
        return

    while True:
        # Dynamic Sleep: Check if it's night time and sleep until dawn if so.
        is_daylight, sleep_sec = check_daylight()
        if not is_daylight:
            # We wake up 5 minutes before sunrise to ensure the camera and logic are ready.
            # A minimum sleep of 60 seconds prevents any tight-loop issues near the transition.
            buffer_sec = 300 
            actual_sleep = max(60, sleep_sec - buffer_sec)
            
            wake_up_time = (datetime.datetime.now() + datetime.timedelta(seconds=actual_sleep)).strftime("%I:%M %p")
            logger.info(f"It is night time. Releasing stream and sleeping until {wake_up_time} ({actual_sleep/3600:.2f} hours)...")
            
            motion_detector.release() # Close the RTSP connection to save camera/network resources
            time.sleep(actual_sleep)
            motion_detector.connect() # Re-establish connection for the morning
            continue
            
        # Efficient yield: check cooldowns before reading from the camera stream
        now = time.time()
        sighting_rem = max(0, int(SIGHTING_COOLDOWN - (now - LAST_SIGHTING_TIME)))
        analysis_rem = max(0, int(ANALYSIS_COOLDOWN - (now - LAST_ANALYSIS_TIME)))
        
        if sighting_rem > 0 or analysis_rem > 0:
            if not COOLDOWN_ACTIVE:
                logger.info(f"Cooldown active: Sighting ({sighting_rem}s remaining), Analysis ({analysis_rem}s remaining)")
                COOLDOWN_ACTIVE = True
            time.sleep(1)
            continue
        
        if COOLDOWN_ACTIVE:
            logger.info("Cooldowns expired. Resuming motion detection.")
            COOLDOWN_ACTIVE = False

        # Deep Monitoring Optimization: Adaptive Polling
        time_since_motion = now - LAST_MOTION_TIME
        deep_threshold = CONFIG.get('DEEP_MONITORING_THRESHOLD_MINUTES', 5) * 60
        
        if time_since_motion > deep_threshold:
            check_interval = CONFIG.get('DEEP_MONITORING_INTERVAL_MS', 2000) / 1000.0
            if not DEEP_SLEEP_ACTIVE:
                logger.info(f"No motion for {deep_threshold/60:.0f} mins. Entering Deep Monitoring ({check_interval:.0f}s polling).")
                DEEP_SLEEP_ACTIVE = True
        else:
            if DEEP_SLEEP_ACTIVE:
                logger.info("Activity detected. Resuming Standard Monitoring.")
                DEEP_SLEEP_ACTIVE = False
            check_interval = CONFIG.get('MOTION_CHECK_INTERVAL_MS', 500) / 1000.0

        time.sleep(check_interval)

        frame = motion_detector.read_frame()
        if frame is None:
            continue

        detected, crop, bounds = motion_detector.detect(frame)
        
        if detected:
            LAST_MOTION_TIME = time.time()
            MOTION_CONSECUTIVE_COUNT += 1
            
            verification_threshold = CONFIG.get('MOTION_VERIFICATION_FRAMES', 2)
            if MOTION_CONSECUTIVE_COUNT < verification_threshold:
                logger.info(f"Motion detected ({MOTION_CONSECUTIVE_COUNT}/{verification_threshold}). Verifying...")
                continue

            logger.info(f"Motion verified after {MOTION_CONSECUTIVE_COUNT} consecutive frames. Starting Speculative Capture...")
            MOTION_CONSECUTIVE_COUNT = 0 # Reset after successful verification
            
            # Phase 1: Pre-prepare recording assets
            timestamp = datetime.datetime.now().isoformat()
            filename_base = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            hq_snap_path = f"../static/captures/{filename_base}_hq.jpg"
            hq_video_path = f"../static/captures/{filename_base}_hq.mp4"
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(hq_snap_path), exist_ok=True)
            
            # Start the HQ recording IMMEDIATELY in the background
            duration = CONFIG.get('VIDEO_DURATION_SECONDS', 30)
            capture_proc = recorder.start_capture(hq_video_path, hq_snap_path, duration)
            
            if not capture_proc:
                logger.error("Failed to start speculative hq capture.")
                continue

            # Phase 2: Analyze with Gemini WHILE recording
            logger.info("Analyzing with Gemini while HQ recording is in progress...")
            
            # Encode crop to JPEG bytes in memory to avoid Disk I/O
            success, buffer = cv2.imencode(".jpg", crop)
            if not success:
                logger.error("Failed to encode crop for AI analysis.")
                recorder.cancel_capture(capture_proc, hq_video_path, hq_snap_path)
                continue
            
            crop_bytes = buffer.tobytes()
            
            # Call Gemini (This takes 3-5 seconds)
            context = {
                "location": os.getenv("LOCATION_NAME", "Unknown"),
                "time": datetime.datetime.now().strftime("%I:%M %p"),
                "date": datetime.datetime.now().strftime("%Y-%m-%d"),
                "setting": os.getenv("FEEDER_SETTING", "Bird Feeder")
            }
            analysis = gemini_client.analyze_image(crop_bytes, context=context)
            logger.info(f"Gemini response: {analysis}")
            LAST_ANALYSIS_TIME = time.time()
            
            if analysis and analysis.get('is_bird'):
                # Bird confirmed! hand off to separate thread to finish recording and notify backend
                confidence = analysis.get('confidence', 1.0)
                logger.info(f"Bird confirmed ({confidence:.2f}): {analysis.get('species')}. Letting capture finish.")
                    
                t = threading.Thread(
                    target=handle_sighting, 
                    args=(analysis, capture_proc, hq_video_path, hq_snap_path, timestamp)
                )
                t.start()
            else:
                # Not a bird! Stop the recording and delete files immediately
                logger.info("Not a bird or analysis failed. Stopping speculative capture.")
                recorder.cancel_capture(capture_proc, hq_video_path, hq_snap_path)
        else:
            MOTION_CONSECUTIVE_COUNT = 0        


if __name__ == "__main__":
    main()
