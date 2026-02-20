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
        
        # 1. Preprocessing: Downscale for performance
        frame, scale = self._resize_frame(original_frame)
        
        # 2. Background Subtraction
        # We need a valid mask even during warmup to keep the history updating
        fg_mask = self.back_sub.apply(frame)

        # Skip actual detection logic during warmup period to let the background model stabilize
        if self.frame_count <= 1:
            return False, None, None
        
        # 3. Thresholding & Noise Reduction
        thresh = self._process_threshold(fg_mask)
        
        # 4. ROI Masking
        thresh = self._apply_roi(thresh, frame.shape)
        
        # 5. Contour Detection
        largest_contour = self._find_largest_motion(thresh)
        
        if largest_contour is not None:
            # 6. Smart Crop Generation
            return self._create_smart_crop(original_frame, largest_contour, scale)

        return False, None, None

    def _resize_frame(self, frame):
        """
        Resizes the frame to the configured analysis width.
        
        Args:
            frame (numpy.ndarray): Original frame.
            
        Returns:
            tuple: (resized_frame, scale_factor)
        """
        target_width = self.config.get('MOTION_ANALYSIS_WIDTH', 480)
        h_orig, w_orig = frame.shape[:2]
        scale = target_width / float(w_orig)
        target_height = int(h_orig * scale)
        
        resized = cv2.resize(frame, (target_width, target_height), interpolation=cv2.INTER_AREA)
        return resized, scale

    def _process_threshold(self, fg_mask):
        """
        Applies thresholding and morphological operations to the foreground mask.
        
        Args:
            fg_mask (numpy.ndarray): The raw background subtraction mask.
            
        Returns:
            numpy.ndarray: The cleaned binary threshold image.
        """
        thresh_val = self.config.get('MOTION_THRESHOLD_BINARY', 244)
        _, thresh = cv2.threshold(fg_mask, thresh_val, 255, cv2.THRESH_BINARY)
        
        # Noise reduction: open to remove specks, dilate to join nearby regions
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        thresh = cv2.dilate(thresh, kernel, iterations=1)
        
        return thresh

    def _apply_roi(self, thresh, frame_shape):
        """
        Applies the Region of Interest (ROI) mask if configured.
        
        Args:
            thresh (numpy.ndarray): The binary threshold image.
            frame_shape (tuple): Shape of the *resized* frame (h, w).
            
        Returns:
            numpy.ndarray: The masked threshold image.
        """
        roi = self.config.get('MOTION_DETECTION_ROI', [0, 0, 100, 100])
        
        # If ROI is full screen, skip masking
        if roi == [0, 0, 100, 100]:
            return thresh
            
        mask = np.zeros(thresh.shape, dtype=np.uint8)
        h, w = frame_shape[:2]
        ymin, xmin, ymax, xmax = roi
        
        # Convert percentage-based ROI to pixel coordinates
        roi_y1 = int(h * ymin / 100.0)
        roi_y2 = int(h * ymax / 100.0)
        roi_x1 = int(w * xmin / 100.0)
        roi_x2 = int(w * xmax / 100.0)
        
        # self.logger.debug(f"ROI Mask: y={roi_y1}-{roi_y2}, x={roi_x1}-{roi_x2}")
        cv2.rectangle(mask, (roi_x1, roi_y1), (roi_x2, roi_y2), 255, -1)
        
        return cv2.bitwise_and(thresh, mask)

    def _find_largest_motion(self, thresh):
        """
        Finds the largest contour in the threshold image that exceeds the minimum area.
        
        Args:
            thresh (numpy.ndarray): The binary threshold image.
            
        Returns:
            numpy.ndarray or None: The largest valid contour.
        """
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        min_area = self.config.get('MIN_AREA_PIXELS', 5000)
        largest_contour = None
        largest_area = 0

        for contour in contours:
            area = cv2.contourArea(contour)
            if area > largest_area:
                largest_area = area
                if area > min_area:
                    largest_contour = contour
        
        if largest_contour is not None:
            total_mask = cv2.countNonZero(thresh)
            self.logger.info(f"Motion detected! Largest area: {largest_area}, total mask: {total_mask}")
                    
        return largest_contour

    def _create_smart_crop(self, original_frame, contour, scale):
        """
        Creates a cropped image from the original frame based on the detected motion contour,
        adding padding and ensuring bounds are respected.
        
        Args:
            original_frame (numpy.ndarray): The full-resolution frame.
            contour (numpy.ndarray): The motion contour (in resized coordinates).
            scale (float): The scaling factor used for resizing.
            
        Returns:
            tuple: (True, crop_image, (x, y, w, h))
        """
        # Get bounding box in downscaled coordinates
        x, y, w, h = cv2.boundingRect(contour)
        
        # Scale coordinates back to original resolution
        x = int(x / scale)
        y = int(y / scale)
        w = int(w / scale)
        h = int(h / scale)
        
        # Smart Crop: Expand the box slightly for context
        h_frame, w_frame = original_frame.shape[:2]
        padding = self.config.get('CROP_PADDING', 50)
        
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(w_frame, x + w + padding)
        y2 = min(h_frame, y + h + padding)
        
        crop = original_frame[y1:y2, x1:x2]
        
        return True, crop, (x, y, w, h)

    def release(self):
        """Releases the video capture resource."""
        if self.cap:
            self.cap.release()

