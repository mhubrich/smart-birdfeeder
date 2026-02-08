---
trigger: always_on
---

# Rule: Commenting Standards

## Philosophy
Code explains *what* is happening. Comments explain *why* it is happening.

## Requirements

### 1. File Headers
Every source file (`.py`, `.js`, `.jsx`, `.ts`, `.sh`) must start with a block comment describing its purpose.

**Example (Python):**
```python
# -----------------------------------------------------------------------------
# Module: MotionDetector
# Purpose: Analyzes the LQ RTSP stream to detect bird activity using background subtraction.
# -----------------------------------------------------------------------------
```

**Example (JavaScript):**
```js
/**
 * @module SightingController
 * @description Handles incoming webhooks from the Vision Service and updates the SQLite DB.
 */
```

### 2. Docstrings & JSDoc
* **Python:** Every class and function must have a triple-quoted docstring explaining arguments, return values, and exceptions.
* **JavaScript/Node:** Every function must use JSDoc `(/** ... */)` notation.

**Example (Python):**
```python
def check_cooldown(self, species_name):
    """
    Determines if a notification should be sent based on the last sighting time.

    Args:
        species_name (str): The classification result from Gemini.

    Returns:
        bool: True if we are outside the cooldown window, False otherwise.
    """
```

### 3. Inline "Why" Comments
You must leave an inline comment for any non-trivial logic. Do not describe the syntax; describe the intent.

* **Magic Numbers:** Explain why a specific threshold was chosen.
* **Async Logic:** Explain race condition handling in the Notification/Recording pipeline.
* *Math:** Explain formulas (e.g., coordinate mapping between LQ and HQ streams).

**Example (JavaScript):**
```js
// We add a 200ms buffer here because the RTSP stream timestamp often 
// lags slightly behind the system clock, causing synchronization issues.
const syncTime = cameraTime + 200;
```
