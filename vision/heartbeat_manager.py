# -----------------------------------------------------------------------------
# Module: Heartbeat Manager
# Purpose: Sends periodic heartbeat signals to the backend to indicate service health.
# -----------------------------------------------------------------------------

import time
import requests
import logging
import threading

logger = logging.getLogger("HeartbeatManager")

class HeartbeatManager:
    """
    Manages the sending of heartbeat signals to the backend.
    """

    def __init__(self, backend_url, api_key, config):
        """
        Initialize the HeartbeatManager.

        Args:
            backend_url (str): The base URL of the backend API.
            api_key (str): The internal API key for authentication.
            config (dict): Configuration dictionary containing heartbeat settings.
        """
        self.backend_url = backend_url
        self.api_key = api_key
        self.interval = config.get('HEARTBEAT_INTERVAL_SECONDS', 60)
        self.last_heartbeat_time = 0
        self.running = True

    def send_heartbeat(self):
        """
        Sends a heartbeat to the backend if the interval has passed.
        This method is non-blocking (runs network request in a separate thread if needed,
        but for simplicity/robustness we might just do a quick timeout request).
        To avoid blocking the main loop, we'll run the actual request in a thread.
        """
        now = time.time()
        if now - self.last_heartbeat_time >= self.interval:
            self.last_heartbeat_time = now
            t = threading.Thread(target=self._do_request)
            t.daemon = True
            t.start()

    def _do_request(self):
        """
        Performs the actual HTTP request.
        """
        try:
            payload = {
                "service": "vision_service",
                "status": "running",
                "metadata": {
                    "uptime": time.time() # simplistic uptime
                }
            }
            url = f"{self.backend_url}/webhook/heartbeat"
            requests.post(url, json=payload, headers={"X-API-Key": self.api_key}, timeout=5)
        except Exception as e:
            logger.error(f"Failed to send heartbeat: {e}")
