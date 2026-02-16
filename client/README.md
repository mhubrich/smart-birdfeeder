# 📱 Client Documentation (PWA)

The Frontend interface for Raspberry Bird. It is a Progressive Web App (PWA) that provides a native-like experience on mobile devices, styled with a **Playful Geometric** design system.

## 📋 Project Overview
Built with **React 18** and **Vite**, this application serves as the primary dashboard for bird enthusiasts. It features real-time sighting updates, a media carousel for high-quality recordings, and comprehensive bird collection management. The interface is optimized for high-performance interaction on both desktop and mobile browsers.

## 🛠️ Tech Stack
*   **Framework**: React 18
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS v4 (using CSS variables in `index.css`)
*   **Design System**: Playful Geometric (High-contrast, bold borders, and vibrant accents)
*   **PWA**: `vite-plugin-pwa` with custom Service Worker for offline resilience
*   **Icons**: Lucide React
*   **Time**: `date-fns` (relative time formatting)

## 🎨 Design System: Playful Geometric
The application uses a bold, energetic design language characterized by:
*   **High-Contrast Borders**: All interactive elements feature `2px border-foreground` for a distinct "pop" look.
*   **Hard Shadows**: Custom shadows (e.g., `4px 4px 0px 0px #1E293B`) provide a tactile, retro-modern feel.
*   **Vibrant Palette**:
    *   **Primary Accent**: `#8B5CF6` (Violet)
    *   **Secondary/Tertiary**: Soft Pinks and Golden Yellows.
    *   **Success/Quaternary**: Mint Green for accents.
*   **Typography**: 
    *   **Display**: *Outfit* (Geometric and friendly).
    *   **Body**: *Plus Jakarta Sans* (Highly readable).
*   **Micro-interactions**: Subtle `scale-105` on hover and `scale-95` on click for tactile link feedback.

## 📦 Component Architecture

### 1. UI Atoms (`src/components/ui/`)
*   **`Button.jsx`**: Bold, bordered buttons with geometric shadows.
*   **`Card.jsx`**: Elevates content using the hard-shadow system and `24px` rounded corners.
*   **`IconButton.jsx`**: Circular, high-contrast buttons for secondary actions.

### 2. `Feed.jsx`
The central hub of the application.
*   **Phase Sync**: Automatically handles the transition from Phase 1 (Recording) to Phase 2 (Ready) states via polling.
*   **Dialog Management**: Uses custom geometric modals for species correction and deletion confirmation.
*   **System Status**: Integrates `<SystemStatus />` to provide real-time health monitoring of the Vision Service (Green Pulse = Online).

### 3. `SightingCard.jsx`
The core experience module.
*   **Dual-Media Carousel**: Toggles between AI preview crops and final HQ 2K recordings.
*   **Instagram-Style Aspect**: Fixed `4:5` ratio for optimal bird viewing on mobile.
*   **Dynamic Actions**: Download, Edit, and Delete triggers with instant UI feedback.

## 🚀 Development Guide

### Installation
```bash
cd client
npm install
```

### Local Dev
```bash
npm run dev
# Dashboard accessible at http://localhost:5173
```

### Building for Production
```bash
npm run build
# The /dist folder is served as static files by the Node.js server.
```

## 📡 Base Path & Tunnel Support

The client is configured with a base path of `/bird/` (see `vite.config.js`). 

- **Why?**: This allows the app to be served behind a sub-path proxy (like a Cloudflare Tunnel at `domain.com/bird`) without breaking asset links.
- **API Calls**: All `fetch` calls use `import.meta.env.BASE_URL` to ensure they point to the correct relative path regardless of where the app is hosted.
- **PWA**: The service worker is also scoped to the base path to ensure push notifications and caching work correctly behind the tunnel.

## 🧪 Verification Steps

1.  **Visual Audit**: Check that cards have the signature `2px` black border and hard shadows.
2.  **PWA Lifecycle**: Open the app, then go offline. The shell and recent sightings should remain accessible.
3.  **Notification Pipeline**: Click the **Bell** icon in the header. Grant permission when prompted to enable real-time bird alerts.
4.  **Carousel Sync**: Verify that the "Recording" pulse badge disappears and the video icon appears once the Vision service finishes Phase 2.
