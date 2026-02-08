# -----------------------------------------------------------------------------
# Module: MotionDetector
# Purpose: Analyzes the LQ RTSP stream to detect bird activity using background subtraction.
# -----------------------------------------------------------------------------

import cv2
import time
import numpy as np
import logging

class MotionDetector:
    """
    Handles motion detection on the Low Quality (LQ) RTSP stream.
    """

    def __init__(self, rtsp_url, config):
        """
        Initialize the MotionDetector.

        Args:
            rtsp_url (str): The RTSP URL for the Low Quality stream.
            config (dict): Configuration dictionary loaded from settings.yaml.
        """
        self.rtsp_url = rtsp_url
        self.config = config
        self.cap = None
        history = config.get('MOG2_HISTORY', 500)
        self.back_sub = cv2.createBackgroundSubtractorMOG2(history=history, varThreshold=config.get('MOTION_THRESHOLD', 25), detectShadows=False)
        self.frame_count = 0
        self.logger = logging.getLogger(__name__)

    def connect(self):
        """
        Establishes connection to the RTSP stream.
        """
        if self.cap is not None and self.cap.isOpened():
            self.cap.release()
        
        self.logger.info(f"Connecting to RTSP stream: {self.rtsp_url}")
        self.cap = cv2.VideoCapture(self.rtsp_url)
        if not self.cap.isOpened():
            self.logger.error("Failed to open RTSP stream")
            return False
        return True

    def read_frame(self):
        """
        Reads a frame from the stream.
        """
        if self.cap is None or not self.cap.isOpened():
            if not self.connect():
                time.sleep(5) # Wait before retry
                return None
        
        ret, frame = self.cap.read()
        if not ret:
            self.logger.warning("Failed to read frame from stream, reconnecting...")
            self.connect()
            return None
        return frame

    def detect(self, frame):
        """
        Analyzes a frame for motion.

        Args:
            frame (numpy.ndarray): The frame to analyze.

        Returns:
            tuple: (detected (bool), crop (numpy.ndarray or None), bounds (tuple or None))
        """
        self.frame_count += 1
        
        # Frame Throttling: Process only every Nth frame
        frame_skip = self.config.get('ANALYSIS_FRAME_SKIP', 6)
        if self.frame_count % frame_skip != 0:
            return False, None, None

        min_area = self.config.get('MIN_AREA_PIXELS', 500)

        # Apply background subtraction
        fg_mask = self.back_sub.apply(frame)
        
        # Threshold the mask to remove shadows/noise
        thresh_val = self.config.get('MOTION_THRESHOLD_BINARY', 244)
        _, thresh = cv2.threshold(fg_mask, thresh_val, 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        largest_contour = None
        largest_area = 0

        for contour in contours:
            area = cv2.contourArea(contour)
            if area > min_area:
                if area > largest_area:
                    largest_area = area
                    largest_contour = contour
        
        if largest_contour is not None:
             # Get bounding box
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # Smart Crop: Expand the box slightly for context, but keep within bounds
            h_frame, w_frame = frame.shape[:2]
            padding = self.config.get('CROP_PADDING', 50)
            
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(w_frame, x + w + padding)
            y2 = min(h_frame, y + h + padding)
            
            crop = frame[y1:y2, x1:x2]
            
            return True, crop, (x, y, w, h)

        return False, None, None

    def release(self):
        """Releases the video capture resource."""
        if self.cap:
            self.cap.release()

