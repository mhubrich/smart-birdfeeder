# Node.js PWA & Push Notifications Guide

## Core Libraries
* `web-push`: For backend VAPID signature generation.
* `workbox-window`: For easy Service Worker registration in React.

## Workflow
1.  **VAPID Keys:** Generate these once (public/private). Public key goes to frontend, Private key stays in `.env`.
2.  **Subscription:**
    * Frontend requests permission.
    * Browser generates `PushSubscription` object (contains endpoint + keys).
    * Frontend sends this JSON to Node.js `POST /api/subscribe`.
    * Node saves to `sqlite`.

## iOS Specifics (PWA)
* Web Push on iOS (16.4+) only works if the app is **Added to Home Screen**.
* The Manifest must include `"display": "standalone"`.
* User interaction (button click) is required to request permission; it cannot run `onLoad`.

## Handling the Push Event (Service Worker)
The SW must handle the `push` event, extract the payload (Image URL, Body), and call `self.registration.showNotification`.
