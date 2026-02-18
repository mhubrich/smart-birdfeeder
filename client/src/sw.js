/* eslint-disable no-undef */
/**
 * @module ServiceWorker
 * @description Handles background tasks, precaching, and push notifications for the PWA.
 */

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

self.skipWaiting()
clientsClaim()

self.addEventListener('push', (event) => {
    const data = event.data.json();
    const title = data.title || 'Raspberry Bird';

    const options = {
        body: data.body,
        icon: data.icon || '/bird/pwa-192x192.png',
        image: data.image,
        badge: '/bird/badge.png',
        data: data.data
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // The URL we want to open
    const targetPath = event.notification.data?.url || '/bird/';
    // Construct absolute URL for matching
    const targetUrl = new URL(targetPath, self.location.origin).href;

    // Open the app or focus window
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there is already a window open with this URL
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
