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
        self.last_read_time = time.time()
        self.logger = logging.getLogger(__name__)

    def connect(self, reconnect=False):
        """
        Establishes connection to the RTSP stream and detects FPS.
        """
        if self.cap is not None and self.cap.isOpened():
            self.cap.release()
        
        if not reconnect:
            self.logger.info(f"Connecting to RTSP stream: {self.rtsp_url}")
        self.cap = cv2.VideoCapture(self.rtsp_url)
        if not self.cap.isOpened():
            self.logger.error("Failed to open RTSP stream")
            return False
            
        # Detect FPS (with fallback)
        fps = self.cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0 or fps > 120:  # Sanity check
            fps = self.config.get('CAMERA_FPS_FALLBACK', 25)
            self.logger.warning(f"Could not detect stream FPS, using fallback: {fps}")
        else:
            if not reconnect:
                self.logger.info(f"Detected stream FPS: {fps}")
        self.fps = fps
        self.last_read_time = time.time() # Reset timer on every new connection
        
        return True

    def _get_flush_count(self, elapsed_seconds):
        """
        Calculates how many frames to flush based on elapsed time and FPS.
        If the backlog is too large (> 10 seconds), signals for a reconnect.
        """
        if elapsed_seconds > 10:
            return -1
        return int(elapsed_seconds * self.fps) + 1

    def read_frame(self):
        """
        Reads a frame from the stream, ensuring it is a "live" frame by 
        flushing any buffered backlog since the last read.
        """
        if self.cap is None or not self.cap.isOpened():
            if not self.connect():
                time.sleep(5) # Wait before retry
                return None
        
        # 1. Flush logic: get to the most recent frame
        elapsed = time.time() - self.last_read_time
        flush_count = self._get_flush_count(elapsed)
        
        if flush_count == -1:
            self.logger.info(f"Backlog too large ({elapsed:.1f}s), reconnecting to stream...")
            self.connect(reconnect=True)
        elif flush_count > 0:
            for _ in range(flush_count):
                self.cap.grab()
        
        # 2. Actual read
        ret, frame = self.cap.read()
        self.last_read_time = time.time() # Update timer AFTER read
        
        if not ret:
            self.logger.warning("Failed to read frame from stream, reconnecting...")
            self.connect()
            return None
            
        return frame

    def detect(self, original_frame):
        """
        Analyzes a frame for motion.

        Args:
            original_frame (numpy.ndarray): The frame to analyze.

        Returns:
            tuple: (detected (bool), crop (numpy.ndarray or None), bounds (tuple or None))
        """
        self.frame_count += 1
        
        # Downscale for performance
        target_width = self.config.get('MOTION_ANALYSIS_WIDTH', 480)
        h_orig, w_orig = original_frame.shape[:2]
        scale = target_width / float(w_orig)
        target_height = int(h_orig * scale)
        
        frame = cv2.resize(original_frame, (target_width, target_height), interpolation=cv2.INTER_AREA)
        
        min_area = self.config.get('MIN_AREA_PIXELS', 10000)
        fg_mask = self.back_sub.apply(frame)
        
        # Threshold the mask to remove shadows/noise
        thresh_val = self.config.get('MOTION_THRESHOLD_BINARY', 244)
        _, thresh = cv2.threshold(fg_mask, thresh_val, 255, cv2.THRESH_BINARY)
        
        # ROI Masking: Ignore motion outside the defined Region of Interest
        roi = self.config.get('MOTION_DETECTION_ROI', [0, 0, 100, 100])
        if roi != [0, 0, 100, 100]:
            mask = np.zeros(thresh.shape, dtype=np.uint8)
            ymin, xmin, ymax, xmax = roi
            
            # Convert percentage-based ROI to pixel coordinates for the downscaled frame
            roi_y1 = int(target_height * ymin / 100.0)
            roi_y2 = int(target_height * ymax / 100.0)
            roi_x1 = int(target_width * xmin / 100.0)
            roi_x2 = int(target_width * xmax / 100.0)
            
            self.logger.debug(f"ROI Mask: y={roi_y1}-{roi_y2}, x={roi_x1}-{roi_x2}")
            cv2.rectangle(mask, (roi_x1, roi_y1), (roi_x2, roi_y2), 255, -1)
            thresh = cv2.bitwise_and(thresh, mask)
        
        # Noise reduction: join nearby motion pixels and remove tiny specks
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        thresh = cv2.dilate(thresh, kernel, iterations=1)

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
             # Get bounding box in downscaled coordinates
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # Scale coordinates back to original
            x = int(x / scale)
            y = int(y / scale)
            w = int(w / scale)
            h = int(h / scale)
            
            # Smart Crop: Expand the box slightly for context, but keep within bounds
            h_frame, w_frame = original_frame.shape[:2]
            padding = self.config.get('CROP_PADDING', 50)
            
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(w_frame, x + w + padding)
            y2 = min(h_frame, y + h + padding)
            
            crop = original_frame[y1:y2, x1:x2]
            
            return True, crop, (x, y, w, h)

        return False, None, None

    def release(self):
        """Releases the video capture resource."""
        if self.cap:
            self.cap.release()

