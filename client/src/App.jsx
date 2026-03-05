/**
 * @module App
 * @description Root component that handles authentication state and routing between Login and Feed.
 */

import React, { useState, useEffect, useRef } from 'react';
import Feed from './components/Feed';
import Login from './components/Login';
import { urlBase64ToUint8Array } from './lib/utils';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'default'
  );
  const isSubscribing = useRef(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return;
    }

    const permission = 'Notification' in window ? Notification.permission : 'default';
    setNotificationPermission(permission);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const subscribed = !!subscription;
      setIsSubscribed(subscribed);

      // Auto-prompt logic:
      // If permission is 'default' (not granted or denied), ask for it.
      // If permission is 'granted' but not subscribed, try to subscribe silently (or re-prompt).
      if (permission === 'default') {
        // Note: Browsers might block this if not triggered by user interaction.
        handleSubscribe(false);
      } else if (permission === 'granted' && !subscribed) {
        handleSubscribe(false);
      }

    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/me`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        await checkAuth();

        // Attempt to trigger subscription prompt while we still potentially have user interaction context
        if ('Notification' in window && Notification.permission === 'default') {
          handleSubscribe(false);
        }

        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.BASE_URL}api/auth/logout`, { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubscribe = async (manual = true) => {
    if (isSubscribing.current) return;
    isSubscribing.current = true;

    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        if (manual) alert('Your browser doesn\'t support push notifications.');
        return;
      }

      // Check if permission is already explicitly denied
      // If it's manual, we tell the user. If auto, we just update state and stop.
      if ('Notification' in window && Notification.permission === 'denied') {
        if (manual) alert('Notification permission is blocked. Please click the lock icon in the address bar to reset permissions.');
        setNotificationPermission('denied');
        return;
      }

      // Request permission.
      // Note: This might fail without a user gesture in some browsers if manual is false.
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== 'granted') {
        console.warn('Notification permission denied:', permission);
        if (manual) alert('Permission not granted for notifications.');
        return;
      }

      // Wait for the service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID key from server
      const configRes = await fetch(`${import.meta.env.BASE_URL}api/config`);
      const config = await configRes.json();
      const vapidPublicKey = config.vapidPublicKey;

      if (!vapidPublicKey) {
        console.error('VAPID public key not found');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      await fetch(`${import.meta.env.BASE_URL}api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      setIsSubscribed(true);
      if (manual) alert('Subscribed to notifications!');
    } catch (err) {
      console.error('Failed to subscribe:', err);
      if (manual) alert('Failed to subscribe: ' + err.message);
    } finally {
      isSubscribing.current = false;
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium font-body">Getting birdy...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground selection:bg-tertiary selection:text-foreground">
      {user ? (
        <Feed
          onLogout={handleLogout}
          onSubscribe={handleSubscribe}
          isSubscribed={isSubscribed}
          notificationPermission={notificationPermission}
        />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
