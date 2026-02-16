# -----------------------------------------------------------------------------
# Module: Main Service
# Purpose: Orchestrates the Vision Service, managing motion detection,
#          AI analysis, and recording.
# -----------------------------------------------------------------------------

import os
import time
import yaml
import logging
import datetime
import cv2
import threading
from pathlib import Path
from dotenv import load_dotenv

# Internal Modules
from motion_detector import MotionDetector
from gemini_client import GeminiClient
from recorder import Recorder
from csv_logger import CSVHandler
from heartbeat_manager import HeartbeatManager
from sun_tracker import SunTracker
from sighting_processor import SightingProcessor

# Load environment variables
load_dotenv(dotenv_path="../.env")

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------
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


class VisionService:
    """
    The main service controller for the Smart Bird Feeder Vision System.
    Orchestrates motion detection, AI analysis, recording, and backend notifications.
    """

    def __init__(self):
        """
        Initializes the VisionService, loading configuration and setting up components.
        """
        logger.info("Initializing Vision Service...")
        
        # Load Configuration
        self.config = self._load_config()
        
        # Initialize State Variables
        self.last_sighting_time = 0
        self.last_analysis_time = 0
        self.last_motion_time = time.time()
        self.motion_consecutive_count = 0
        self.cooldown_active = False
        self.deep_sleep_active = False

        # Load Cooldown Settings
        self.sighting_cooldown = self.config.get('SIGHTING_COOLDOWN_MINUTES', 5) * 60
        self.analysis_cooldown = self.config.get('ANALYSIS_COOLDOWN_SECONDS', 30)

        # Initialize Components
        self._init_components()

    def _load_config(self):
        """
        Loads the application configuration from settings.yaml.
        
        Returns:
            dict: The configuration dictionary.
        """
        try:
            with open("../config/settings.yaml", "r") as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Failed to load settings.yaml: {e}")
            return {}

    def _init_components(self):
        """
        Initializes all sub-components (MotionDetector, Recorder, etc.).
        """
        # Ensure capture directory exists
        Path("../static/captures").mkdir(parents=True, exist_ok=True)

        # 1. Motion Detection (Low Quality Stream)
        self.motion_detector = MotionDetector(os.getenv("RTSP_URL_LQ"), self.config)

        # 2. AI Analysis
        self.gemini_client = GeminiClient(os.getenv("GEMINI_API_KEY"))

        # 3. Recording (High Quality Stream)
        self.recorder = Recorder(os.getenv("RTSP_URL_HQ"), self.config)

        # 4. Backend Communication
        self.backend_url = f"http://localhost:{os.getenv('PORT', 3100)}/api"
        self.api_key = os.getenv("INTERNAL_API_KEY")
        
        self.heartbeat_manager = HeartbeatManager(self.backend_url, self.api_key, self.config)
        self.sighting_processor = SightingProcessor(self.backend_url, self.api_key, self.recorder, self.config)

        # 5. Environment Monitoring
        self.sun_tracker = SunTracker()

    def run(self):
        """
        The main execution loop.
        """
        logger.info("Starting Vision Service Loop...")

        if not self.motion_detector.connect():
            logger.error("Could not connect to LQ Stream. Exiting.")
            return

        while True:
            try:
                # 1. Heartbeat
                self.heartbeat_manager.send_heartbeat()

                # 2. Night Mode Management
                should_sleep, sleep_duration = self._check_night_mode()
                if should_sleep:
                    self._enter_night_sleep(sleep_duration)
                    continue

                # 3. Rate Limiting
                if self._check_cooldowns():
                    time.sleep(1)
                    continue

                # 4. Adaptive Polling (Deep Monitoring)
                check_interval = self._get_polling_interval()
                time.sleep(check_interval)

                # 5. Motion Logic
                self._process_motion()

            except Exception as e:
                logger.error(f"Error in main loop: {e}", exc_info=True)
                time.sleep(5) # Prevent tight error loops

    def _check_night_mode(self):
        """
        Determines if the service should enter night sleep mode.

        Returns:
            tuple: (bool should_sleep, float sleep_duration)
        """
        is_daylight, sleep_sec = self.sun_tracker.check_daylight()
        
        if not is_daylight:
            # Wake up 5 minutes before sunrise to ensure readiness.
            buffer_sec = 300 
            actual_sleep = max(60, sleep_sec - buffer_sec)
            return True, actual_sleep
        
        return False, 0

    def _enter_night_sleep(self, duration):
        """
        Puts the service to sleep for the specified duration.
        Releases camera resources to save power/bandwidth.
        
        Args:
            duration (float): Seconds to sleep.
        """
        wake_up_time = (datetime.datetime.now() + datetime.timedelta(seconds=duration)).strftime("%I:%M %p")
        logger.info(f"It is night time. Releasing stream and sleeping until {wake_up_time} ({duration/3600:.2f} hours)...")
        
        self.motion_detector.release()
        time.sleep(duration)
        self.motion_detector.connect()

    def _check_cooldowns(self):
        """
        Checks if any rate-limiting cooldowns are active.

        Returns:
            bool: True if a cooldown is active and we should skip processing, False otherwise.
        """
        now = time.time()
        sighting_rem = max(0, int(self.sighting_cooldown - (now - self.last_sighting_time)))
        analysis_rem = max(0, int(self.analysis_cooldown - (now - self.last_analysis_time)))

        if sighting_rem > 0 or analysis_rem > 0:
            if not self.cooldown_active:
                logger.info(f"Cooldown active: Sighting ({sighting_rem}s remaining), Analysis ({analysis_rem}s remaining)")
                self.cooldown_active = True
            return True
        
        if self.cooldown_active:
            logger.info("Cooldowns expired. Resuming motion detection.")
            self.cooldown_active = False
            
        return False

    def _get_polling_interval(self):
        """
        Calculates the appropriate polling interval based on recent activity.
        Implements 'Deep Monitoring' to save CPU during long periods of inactivity.

        Returns:
            float: The sleep interval in seconds.
        """
        now = time.time()
        time_since_motion = now - self.last_motion_time
        deep_threshold = self.config.get('DEEP_MONITORING_THRESHOLD_MINUTES', 5) * 60

        if time_since_motion > deep_threshold:
            # Slow polling mode
            check_interval = self.config.get('DEEP_MONITORING_INTERVAL_MS', 2000) / 1000.0
            
            if not self.deep_sleep_active:
                logger.info(f"No motion for {deep_threshold/60:.0f} mins. Entering Deep Monitoring ({check_interval:.0f}s polling).")
                self.deep_sleep_active = True
        else:
            # Standard polling mode
            check_interval = self.config.get('MOTION_CHECK_INTERVAL_MS', 500) / 1000.0
            
            if self.deep_sleep_active:
                logger.info("Activity detected. Resuming Standard Monitoring.")
                self.deep_sleep_active = False

        return check_interval

    def _process_motion(self):
        """
        Reads a frame, detects motion, verifies it, and triggers the capture/analysis flow.
        """
        frame = self.motion_detector.read_frame()
        if frame is None:
            return

        detected, crop, bounds = self.motion_detector.detect(frame)

        if not detected:
            self.motion_consecutive_count = 0
            return

        # Motion Detected
        self.last_motion_time = time.time()
        self.motion_consecutive_count += 1

        # Anti-Ghosting Verification
        verification_threshold = self.config.get('MOTION_VERIFICATION_FRAMES', 2)
        if self.motion_consecutive_count < verification_threshold:
            logger.info(f"Motion detected ({self.motion_consecutive_count}/{verification_threshold}). Verifying...")
            return

        # Motion Verified
        frames = self.motion_consecutive_count
        logger.info(f"Motion verified on {frames} consecutive frame{'' if frames == 1 else 's'}. Starting Speculative Capture...")
        self.motion_consecutive_count = 0 
        
        self._trigger_speculative_capture(crop)

    def _trigger_speculative_capture(self, crop):
        """
        Starts the recording and AI analysis process.
        
        Args:
            crop (numpy.ndarray): The cropped image content of the detected motion.
        """
        # 1. Prepare Paths
        timestamp = datetime.datetime.now().isoformat()
        filename_base = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        hq_snap_path = f"../static/captures/{filename_base}_hq.jpg"
        hq_video_path = f"../static/captures/{filename_base}_hq.mp4"
        
        os.makedirs(os.path.dirname(hq_snap_path), exist_ok=True)
        
        # 2. Start Recording (Background)
        duration = self.config.get('VIDEO_DURATION_SECONDS', 30)
        capture_proc = self.recorder.start_capture(hq_video_path, hq_snap_path, duration)
        
        if not capture_proc:
            logger.error("Failed to start speculative hq capture.")
            return

        # 3. Analyze Image (Parallel)
        logger.info("Analyzing with Gemini while HQ recording is in progress...")
        
        analysis = self._analyze_crop(crop)
        self.last_analysis_time = time.time()

        # 4. Decide Logic
        if analysis and analysis.get('is_bird'):
            self._handle_confirmed_bird(analysis, capture_proc, hq_video_path, hq_snap_path, timestamp)
        else:
            logger.info("Not a bird or analysis failed. Canceling speculative capture.")
            self.recorder.cancel_capture(capture_proc, hq_video_path, hq_snap_path)

    def _analyze_crop(self, crop):
        """
        Encodes the crop and sends it to Gemini for analysis.
        
        Args:
            crop (numpy.ndarray): The image crop.
            
        Returns:
            dict: The analysis result or None.
        """
        success, buffer = cv2.imencode(".jpg", crop)
        if not success:
            logger.error("Failed to encode crop for AI analysis.")
            return None
        
        crop_bytes = buffer.tobytes()
        
        context = {
            "location": os.getenv("LOCATION_NAME", "Unknown"),
            "time": datetime.datetime.now().strftime("%I:%M %p"),
            "date": datetime.datetime.now().strftime("%Y-%m-%d"),
            "setting": os.getenv("FEEDER_SETTING", "Bird Feeder")
        }
        
        return self.gemini_client.analyze_image(crop_bytes, context=context)

    def _handle_confirmed_bird(self, analysis, capture_proc, hq_video_path, hq_snap_path, timestamp):
        """
        Hand-off confirmed sighting to SightingProcessor.
        """
        confidence = analysis.get('confidence', 1.0)
        logger.info(f"Bird confirmed ({confidence:.2f}): {analysis.get('species')}. Passing to SightingProcessor.")
        
        self.last_sighting_time = time.time()
        
        sighting_data = {
            "analysis": analysis,
            "capture_proc": capture_proc,
            "hq_video_path": hq_video_path,
            "hq_snap_path": hq_snap_path,
            "timestamp": timestamp
        }
        
        self.sighting_processor.dispatch(sighting_data)


if __name__ == "__main__":
    service = VisionService()
    service.run()
