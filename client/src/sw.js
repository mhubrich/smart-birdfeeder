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
    const title = data.title || 'Smart Birdfeeder';

    const options = {
        body: data.body,
        icon: data.icon || '/icon.png',
        image: data.image,
        badge: '/badge.png',
        data: data.data
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Open the app or focus window
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('/');
        })
    );
});
