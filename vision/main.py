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

# Load environment variables
load_dotenv(dotenv_path="../.env")

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("BirdFeederVision")

# Configuration
def load_config():
    with open("../config/settings.yaml", "r") as f:
        return yaml.safe_load(f)

CONFIG = load_config()

# Global State
LAST_BIRD_TIME = 0
LAST_API_TIME = 0
BIRD_COOLDOWN = CONFIG.get('GLOBAL_COOLDOWN_MINUTES', 5) * 60
API_COOLDOWN = CONFIG.get('API_COOLDOWN_SECONDS', 30)

# Components
motion_detector = MotionDetector(os.getenv("RTSP_URL_LQ"), CONFIG)
gemini_client = GeminiClient(os.getenv("GEMINI_API_KEY"))
recorder = Recorder(os.getenv("RTSP_URL_HQ"), CONFIG)
backend_url = f"http://localhost:{os.getenv('PORT', 3100)}/api"

def check_daylight():
    """
    Checks if it is currently daylight at the configured location.
    """
    coords = CONFIG.get('LOCATION_COORDS', {'LAT': 40.7128, 'LNG': -74.0060})
    sun = Sun(coords['LAT'], coords['LNG'])
    
    now = datetime.datetime.now(datetime.timezone.utc)
    try:
        sunrise = sun.get_sunrise_time()
        sunset = sun.get_sunset_time()
        
        # Handle cases where sunrise/sunset might be tomorrow/yesterday depending on time
        # This is a simplified check
        if sunrise < sunset:
            return sunrise < now < sunset
        else:
             # Polar night/day handling (simplified)
            return True 
    except Exception as e:
        logger.warning(f"Suntime calculation failed: {e}. Defaulting to True.")
        return True

def handle_sighting(crop, crop_path, species_data):
    """
    Handles the sequence of actions when a bird is detected.
    Runs in a separate thread to not block motion detection (if we wanted continuous monitoring, 
    but here we want to record HQ so we might pause motion detection anyway).
    """
    global LAST_BIRD_TIME
    LAST_BIRD_TIME = time.time()
    
    timestamp = datetime.datetime.now().isoformat()
    species = species_data.get('species', 'Unknown')
    reason = species_data.get('identification_reason', 'Detected by AI')
    
    # Phase 1: Notify Backend
    payload = {
        "status": "recording",
        "species": species,
        "reason": reason,
        "timestamp": timestamp,
        "lq_crop_path": os.path.relpath(crop_path, "../static")
    }
    
    try:
        logger.info(f"Sending Phase 1 Notification: {species}")
        # In a real scenario, you might want to retry this
        requests.post(f"{backend_url}/webhook/notify", json=payload)
    except Exception as e:
        logger.error(f"Failed to send Phase 1 notification: {e}")

    # Phase 2: Record HQ Assets
    # Generate filenames based on timestamp
    filename_base = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    hq_snap_path = f"../static/captures/{filename_base}_hq.jpg"
    hq_video_path = f"../static/captures/{filename_base}_hq.mp4"
    
    # Ensure directory exists (it should be relative to where we run this script or absolute)
    # We'll use absolute paths for safety in the DB
    os.makedirs(os.path.dirname(hq_snap_path), exist_ok=True)
    
    # Take Snapshot
    recorder.take_snapshot(hq_snap_path)
    
    # Record Video
    duration = CONFIG.get('VIDEO_DURATION_SECONDS', 30)
    recorder.record_clip(hq_video_path, duration=duration)
    
    # Send Phase 2 Update
    update_payload = {
        "timestamp": timestamp, # Use same timestamp to identify record? Or return ID from Phase 1?
        # Better: Phase 1 returns an ID, here we assume backend can match by timestamp or we should keep ID.
        # For simplicity, we'll assume the backend can match the most recent 'recording' status or we send enough data.
        # Let's send the original timestamp to match.
        "original_timestamp": timestamp,
        "status": "ready",
        "hq_snapshot_path": os.path.relpath(hq_snap_path, "../static"),
        "hq_video_path": os.path.relpath(hq_video_path, "../static")
    }
    
    try:
        logger.info("Sending Phase 2 Update")
        requests.post(f"{backend_url}/webhook/update", json=update_payload)
    except Exception as e:
        logger.error(f"Failed to send Phase 2 update: {e}")
        
    # Cleanup memory
    gc.collect()

def main():
    global LAST_API_TIME
    logger.info("Starting Vision Service...")
    
    # Create capture directory
    Path("../static/captures").mkdir(parents=True, exist_ok=True)
    
    if not motion_detector.connect():
        logger.error("Could not connect to LQ Stream. Exiting.")
        return

    while True:
        # Dynamic Sleep
        if not check_daylight():
            sleep_min = CONFIG.get('NIGHT_SLEEP_MINUTES', 15)
            logger.info(f"It is night time. Sleeping for {sleep_min} minutes...")
            time.sleep(sleep_min * 60)
            continue
            
        frame = motion_detector.read_frame()
        if frame is None:
            continue

        detected, crop, bounds = motion_detector.detect(frame)
        
        if detected:
            now = time.time()
            if now - LAST_BIRD_TIME < BIRD_COOLDOWN:
                logger.info("Motion detected but in bird cooldown.")
                continue
            
            if now - LAST_API_TIME < API_COOLDOWN:
                logger.debug("Motion detected but in API cooldown.")
                continue
                
            logger.info("Motion detected! Analyze with Gemini...")
            
            # Save LQ Crop temporarily
            temp_crop_path = f"../static/captures/temp_lq_{int(time.time())}.jpg"
            import cv2
            cv2.imwrite(temp_crop_path, crop)
            
            # Call Gemini
            analysis = gemini_client.analyze_image(temp_crop_path)
            LAST_API_TIME = time.time()
            
            if analysis and analysis.get('is_bird'):
                logger.info(f"Bird detected: {analysis.get('species')}")
                
                # Start handling thread
                t = threading.Thread(target=handle_sighting, args=(crop, temp_crop_path, analysis))
                t.start()
                
                # Wait a bit to prevent re-triggering immediately on the same bird
                # Though the global cooldown covers this, adding a small sleep helps stability
                time.sleep(CONFIG.get('STABILITY_SLEEP_SECONDS', 5))
            else:
                logger.info("Not a bird or analysis failed.")
                # Clean up temp file if not needed (or keep for debugging)
                # os.remove(temp_crop_path) 
        
        # Free up memory periodically
        gc_interval = CONFIG.get('GC_INTERVAL_FRAMES', 1000)
        if motion_detector.frame_count % gc_interval == 0:
            gc.collect()
            
        # Small sleep to yield CPU if loop is too tight, but read_frame blocks so it's okay.

if __name__ == "__main__":
    main()
