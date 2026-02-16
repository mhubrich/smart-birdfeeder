/**
 * @module PushService
 * @description Manages Web Push notifications using VAPID keys.
 */

const webpush = require('web-push');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

// VAPID keys should be generated with `web-push generate-vapid-keys`
// Public key must be shared with the client.
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL;

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        vapidEmail,
        vapidPublicKey,
        vapidPrivateKey
    );
} else {
    console.warn('VAPID keys not set. Push notifications will not work.');
}

const sendNotification = async (subscription, payload) => {
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        return { success: true };
    } catch (error) {
        // Return the error so the caller can decide if the subscription should be deleted
        return {
            success: false,
            statusCode: error.statusCode,
            endpoint: subscription.endpoint
        };
    }
};

module.exports = {
    sendNotification,
    vapidPublicKey
};
