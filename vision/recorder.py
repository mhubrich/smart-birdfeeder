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
            # Capture stderr so we can debug failures, but keep it out of the main stream
            result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=15, check=True)
            return True
        except subprocess.TimeoutExpired:
            self.logger.error("Snapshot generation timed out")
            return False
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else "Unknown error"
            self.logger.error(f"Snapshot generation failed: {error_msg}")
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
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=duration+10, check=True)
            return True
        except subprocess.TimeoutExpired:
            self.logger.error("Recording timed out")
            return False
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else "Unknown error"
            self.logger.error(f"Recording failed: {error_msg}")
            return False

    def record_and_snap(self, video_path, snap_path, duration=30):
        """
        Optimization: Captures both a video clip and a high-quality snapshot
        in a single RTSP handshake to minimize latency and camera load.

        Args:
            video_path (str): Path to save the HQ video.
            snap_path (str): Path to save the HQ snapshot.
            duration (int): Duration of the video in seconds.
        """
        cmd = [
            'ffmpeg',
            '-y',
            '-rtsp_transport', 'tcp',
            '-i', self.rtsp_url,
            # Output 1: The Video (Stream Copy)
            '-t', str(duration),
            '-c:v', 'copy',
            '-c:a', 'aac',
            video_path,
            # Output 2: The Snapshot (Extracted from the same stream)
            '-ss', '00:00:02', # Skip first frames for better stability
            '-frames:v', '1',
            '-q:v', str(self.config.get('SNAPSHOT_QUALITY', 2)),
            snap_path
        ]

        try:
            self.logger.info(f"Dual-Capture Started: Handshaking with HQ stream for {duration}s...")
            # Using PIPE for stderr so that we only log errors when they actually occur
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=duration+15, check=True)
            self.logger.info("Dual-Capture Complete (Video + Snapshot)")
            return True
        except subprocess.TimeoutExpired:
            self.logger.error("Dual-Capture timed out")
            return False
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else "Unknown error"
            self.logger.error(f"Dual-Capture failed: {error_msg}")
            return False
