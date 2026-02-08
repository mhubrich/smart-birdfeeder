# -----------------------------------------------------------------------------
# Module: Recorder
# Purpose: Manages the High Quality (HQ) RTSP stream to record video and take snapshots.
# -----------------------------------------------------------------------------

import subprocess
import os
import time
import logging

class Recorder:
    """
    Handles recording of High Quality (HQ) video and snapshots using ffmpeg.
    """

    def __init__(self, rtsp_url, config=None):
        """
        Initialize the Recorder.

        Args:
            rtsp_url (str): The RTSP URL for the High Quality stream.
            config (dict, optional): Configuration dictionary.
        """
        self.rtsp_url = rtsp_url
        self.config = config or {}
        self.logger = logging.getLogger(__name__)

    def take_snapshot(self, output_path):
        """
        Captures a single high-quality snapshot.

        Args:
            output_path (str): The path to save the snapshot.
        """
        cmd = [
            'ffmpeg',
            '-y', # Overwrite output file if it exists
            '-rtsp_transport', 'tcp',
            '-i', self.rtsp_url,
            '-frames:v', '1',
            '-q:v', str(self.config.get('SNAPSHOT_QUALITY', 2)), # High quality
            output_path
        ]
        
        try:
            self.logger.info(f"Taking HQ My snapshot: {output_path}")
            # Run ffmpeg, wait for it to finish. Timeout after 10s to be safe.
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15, check=True)
            return True
        except subprocess.TimeoutExpired:
            self.logger.error("Snapshot generation timed out")
            return False
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Snapshot generation failed: {e.stderr.decode()}")
            return False

    def record_clip(self, output_path, duration=30):
        """
        Records a video clip of specific duration.

        Args:
            output_path (str): The path to save the video.
            duration (int): Duration in seconds.
        """
        cmd = [
            'ffmpeg',
            '-y',
            '-rtsp_transport', 'tcp',
            '-i', self.rtsp_url,
            '-t', str(duration),
            '-c:v', 'copy',  # Copy video stream directly to save CPU
            '-c:a', 'aac',   # Re-encode audio to AAC for MP4 compatibility
            output_path
        ]

        try:
            self.logger.info(f"Recording {duration}s clip: {output_path}")
            # Run ffmpeg. This is a blocking call in this thread, 
            # so the caller should run this in a separate thread if non-blocking is needed.
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=duration+10, check=True)
            return True
        except subprocess.TimeoutExpired:
            self.logger.error("Recording timed out")
            return False
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Recording failed: {e.stderr.decode()}")
            return False
