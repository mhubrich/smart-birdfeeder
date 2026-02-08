---
trigger: always_on
---

# Rule: Separation of Concerns (SoC)

## Core Principle
All code must be strictly modular. "God classes" or "God functions" that handle multiple unrelated responsibilities are strictly prohibited.

## Guidelines
1.  **Single Responsibility:** Each class or module should have one, and only one, reason to change.
2.  **Boundary Enforcement:**
    * **Vision Service:**
        * `MotionDetector`: Responsible *only* for analyzing the LQ stream and flagging motion.
        * `Recorder`: Responsible *only* for connecting to the HQ stream and writing files to disk.
        * `GeminiClient`: Responsible *only* for formatting the payload and handling the HTTPS request/response to Google.
    * **App Server:**
        * `Routes`: Responsible *only* for defining endpoints.
        * `Controllers`: Responsible *only* for request logic.
        * `Services`: Responsible *only* for business logic and DB interactions.

## Verification
Before writing code, ask: "Does this function know too much?" If a function is parsing JSON, writing to disk, AND sending a notification, **refactor it immediately.**