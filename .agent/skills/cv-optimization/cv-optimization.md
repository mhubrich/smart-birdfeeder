# Computer Vision Optimization for RPi 3B+

## Resource Constraints
The RPi 3B+ has 1GB RAM. Running a full GUI, Node server, and Python CV pipeline simultaneously requires strict memory management.

## Optimization Strategies

1.  **Dual Stream Strategy:**
    * **Analysis:** Consume the **Low Quality (LQ)** RTSP stream (640x360 or similar) for OpenCV motion detection. This reduces CPU load by ~70% compared to processing 1080p/2k.
    * **Capture:** Only connect to the **High Quality (HQ)** stream momentarily to dump the 30s buffer when motion is confirmed, or use `ffmpeg` as a subprocess to save the stream directly to disk without decoding frames in Python.

2.  **Frame Throttling:**
    * Do not process 30 FPS.
    * **Target:** 3-5 FPS for motion detection.
    * *Implementation:* Read frame -> If `frame_count % 6 != 0` -> Skip.

3.  **Headless Operation:**
    * Ensure `opencv-python-headless` is installed, not the full GUI version.
    * Disable all `cv2.imshow` calls.

4.  **Memory Management:**
    * Trigger Python Garbage Collection `gc.collect()` explicitly after sending a large payload to Gemini to free up the heap immediately.
