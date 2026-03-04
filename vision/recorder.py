# -----------------------------------------------------------------------------
# Module: Recorder
# Purpose: Manages the High Quality (HQ) RTSP stream to record video and take snapshots.
# -----------------------------------------------------------------------------

import subprocess
import os
import logging
import time

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



    def record_and_snap(self, video_path, snap_path, duration=30):
        """
        Captures both a video clip and a high-quality snapshot in a single handshake.
        This is a blocking call.

        Args:
            video_path (str): Path to save the HQ video.
            snap_path (str): Path to save the HQ snapshot.
            duration (int): Duration of the video in seconds.
        """
        process = self.start_capture(video_path, snap_path, duration)
        if process:
            return self.wait_for_capture(process, duration)
        return False

    def start_capture(self, video_path, snap_path, duration=30):
        """
        Starts the FFmpeg capture process in the background.

        Args:
            video_path (str): Path to save the HQ video.
            snap_path (str): Path to save the HQ snapshot.
            duration (int): Duration of the video in seconds.

        Returns:
            subprocess.Popen: The running FFmpeg process object.
        """
        cmd = [
            'ffmpeg',
            '-y',
            # IP cameras often send erratic Presentation Time Stamps (PTS) over Wi-Fi.
            # We ignore them and generate smooth timestamps locally to prevent playback lag.
            '-use_wallclock_as_timestamps', '1',
            '-fflags', '+genpts',
            '-rtsp_transport', 'tcp',
            '-i', self.rtsp_url,
            # Output 1: The Video (Stream Copy)
            '-t', str(duration),
            '-c:v', 'copy',
            '-c:a', 'aac',
            # Optimize MP4 by moving the MOOV atom to the front so it streams instantly on web/mobile
            '-movflags', '+faststart',
            video_path,
            # Output 2: The Snapshot (Extracted from the same stream)
            '-ss', '00:00:02', # Skip first frames for better stability
            '-frames:v', '1',
            '-q:v', str(self.config.get('SNAPSHOT_QUALITY', 2)),
            snap_path
        ]

        try:
            self.logger.info(f"Speculative Capture Started: Handshaking with HQ stream for {duration}s...")
            # We use Popen to run in background
            process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            return process
        except Exception as e:
            self.logger.error(f"Failed to start speculative capture: {e}")
            return None

    def wait_for_capture(self, process, duration):
        """
        Waits for a background capture process to complete.

        Args:
            process (subprocess.Popen): The capture process.
            duration (int): Expected duration of the capture.

        Returns:
            bool: True if successful, False otherwise.
        """
        try:
            # Add a buffer to the timeout
            _, stderr = process.communicate(timeout=duration + 15)
            if process.returncode == 0:
                self.logger.info("Capture Complete (Video + Snapshot)")
                return True
            else:
                error_msg = stderr.decode() if stderr else "Unknown error"
                self.logger.error(f"Capture failed with return code {process.returncode}: {error_msg}")
                return False
        except subprocess.TimeoutExpired:
            self.logger.error("Capture timed out - stopping process")
            process.kill()
            process.wait()
            return False
        except Exception as e:
            self.logger.error(f"Error waiting for capture: {e}")
            return False

    def cancel_capture(self, process, video_path, snap_path):
        """
        Stops a pending capture process and deletes the partial files.

        Args:
            process (subprocess.Popen): The capture process to terminate.
            video_path (str): Path to the partial video file.
            snap_path (str): Path to the partial snapshot file.
        """
        if not process:
            return

        self.logger.info("Canceling capture: Stopping process and deleting files.")
        try:
            process.terminate()
            # Wait briefly for it to shut down
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            
            # Use a small delay to ensure OS has released file handles
            time.sleep(0.5)

            if os.path.exists(video_path):
                os.remove(video_path)
            if os.path.exists(snap_path):
                os.remove(snap_path)
                
            self.logger.info("Speculative capture cleanup complete.")
        except Exception as e:
            self.logger.error(f"Error during capture cancellation: {e}")

