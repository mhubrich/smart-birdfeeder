# -----------------------------------------------------------------------------
# Module: SightingProcessor
# Purpose: Handles the lifecycle of a confirmed bird sighting:
#          1. Phase 1 Notification (Immediate)
#          2. Waiting for High-Quality Recording
#          3. Phase 2 Update (Final assets)
# -----------------------------------------------------------------------------

import threading
import requests
import logging
import os
import gc
import logging

class SightingProcessor:
    """
    Manages the background processing of confirmed sightings to ensure
    the main detection loop is not blocked by network or IO operations.
    """

    def __init__(self, backend_url, api_key, recorder, config):
        """
        Initialize the SightingProcessor.

        Args:
            backend_url (str): The base URL for the backend API.
            api_key (str): Authentication key for the backend.
            recorder (Recorder): Instance of the Recorder class to manage capture.
            config (dict): Configuration dictionary.
        """
        self.backend_url = backend_url
        self.api_key = api_key
        self.recorder = recorder
        self.config = config
        self.logger = logging.getLogger(__name__)

    def dispatch(self, sighting_data):
        """
        Starts a background thread to process the sighting.
        
        Args:
            sighting_data (dict): Dictionary containing all necessary data:
                - analysis (dict): Gemini result
                - capture_proc (subprocess.Popen): Running FFmpeg process
                - hq_video_path (str): Path to video file
                - hq_snap_path (str): Path to snapshot file
                - timestamp (str): ISO timestamp
        """
        t = threading.Thread(
            target=self._process_sighting,
            args=(sighting_data,)
        )
        t.start()

    def _process_sighting(self, data):
        """
        Internal method run in a separate thread.
        Executes the two-phase notification flow.
        """
        analysis = data.get('analysis', {})
        capture_proc = data.get('capture_proc')
        hq_video_path = data.get('hq_video_path')
        hq_snap_path = data.get('hq_snap_path')
        timestamp = data.get('timestamp')

        species = analysis.get('species', 'Unknown')
        reason = analysis.get('identification_reason', 'Detected by AI')
        motion_x = data.get('motion_x', 50.0)
        motion_y = data.get('motion_y', 50.0)

        # ---------------------------------------------------------
        # Phase 1: Immediate Notification (Recording In Progress)
        # ---------------------------------------------------------
        payload = {
            "status": "recording",
            "species": species,
            "reason": reason,
            "timestamp": timestamp,
            "motion_x": motion_x,
            "motion_y": motion_y
        }

        try:
            self.logger.info(f"Sending Phase 1 Notification: {species}")
            requests.post(
                f"{self.backend_url}/webhook/notify", 
                json=payload, 
                headers={"X-API-Key": self.api_key}
            )
        except Exception as e:
            self.logger.error(f"Failed to send Phase 1 notification: {e}")

        # ---------------------------------------------------------
        # Phase 2: Wait for Recording Completion & Final Update
        # ---------------------------------------------------------
        duration = self.config.get('VIDEO_DURATION_SECONDS', 30)
        
        # Block this thread (not the main one) until recording finishes
        success = self.recorder.wait_for_capture(capture_proc, duration)

        if success:
            update_payload = {
                "original_timestamp": timestamp,
                "status": "ready",
                "hq_snapshot_path": os.path.relpath(hq_snap_path, "../static"),
                "hq_video_path": os.path.relpath(hq_video_path, "../static")
            }

            try:
                self.logger.info("Sending Phase 2 Update (Recording Complete)")
                requests.post(
                    f"{self.backend_url}/webhook/update", 
                    json=update_payload, 
                    headers={"X-API-Key": self.api_key}
                )
            except Exception as e:
                self.logger.error(f"Failed to send Phase 2 update: {e}")
        else:
            self.logger.error("Recording failed or timed out. Skipping Phase 2 update.")

        # ---------------------------------------------------------
        # Cleanup
        # ---------------------------------------------------------
        # Force garbage collection to free up any resources from this thread
        gc.collect()
