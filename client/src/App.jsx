/**
 * @module App
 * @description Root component that handles authentication state and routing between Login and Feed.
 */

import React, { useState, useEffect } from 'react';
import Feed from './components/Feed';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

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

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Your browser doesn\'t support push notifications.');
      return;
    }

    // Check if permission is already explicitly denied
    if (Notification.permission === 'denied') {
      alert('Notification permission is blocked. Please click the lock icon in the address bar to reset permissions.');
      return;
    }

    try {
      // Request permission FIRST to ensure the user gesture (click) is still valid.
      // Some browsers block prompts if they are preceded by long-running await calls.
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.warn('Notification permission denied:', permission);
        alert('Permission not granted for notifications. Current status: ' + permission);
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
        alert('Server configuration error: VAPID public key is missing.');
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

      alert('Subscribed to notifications!');
    } catch (err) {
      console.error('Failed to subscribe:', err);
      alert('Failed to subscribe: ' + err.message);
    }
  };

  // Helper for VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

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
        <Feed onLogout={handleLogout} onSubscribe={handleSubscribe} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
