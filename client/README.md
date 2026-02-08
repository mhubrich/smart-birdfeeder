# 📱 Client Documentation (PWA)

The Frontend interface for the Smart Birdfeeder. It is a Progressive Web App (PWA) that provides a native-like experience on mobile devices, styled with the **Material You (MD3)** design system.

## 📋 Project Overview
Built with React and Vite, this application allows users to view a live feed of bird sightings, watch high-quality recordings, and manage their collection. The interface is optimized for mobile-first interaction with a premium aesthetic.

## 🛠️ Tech Stack
*   **Framework**: React 18
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS v4 (CSS-first config)
*   **Design System**: Material You (MD3)
*   **PWA**: `vite-plugin-pwa` + Workbox
*   **Icons**: Lucide React
*   **Time**: `date-fns` for relative timestamp formatting

## 🎨 Design Tokens (MD3)
All styling logic is centralized in `src/index.css` using Tailwind v4 `@theme` variables:
*   **Primary Color**: `#6750A4` (Purple)
*   **Surface Tones**: Uses `surface-container-low` for page backgrounds and `surface-container-high` for dialogs.
*   **Corner Radii**: 
    *   `md-sm`: 12px (Buttons)
    *   `md-md`: 16px (Media)
    *   `md-lg`: 24px (Cards)
    *   `md-xl`: 28px (Dialogs)

## 📦 Core Components

### 1. Unified UI Atoms (`src/components/ui/`)
*   **`Button.jsx`**: Pill-shaped Material buttons with MD3 state layers (hover/active overlays).
*   **`Card.jsx`**: Base elevation system with custom MD3 shadows and rounded corners.
*   **`Input.jsx`**: MD3 "Filled Text Field" style with rounded tops and high-contrast borders.
*   **`Dialog.jsx`**: Modern modal system with 28px radii and atmospheric backdrop blurs.

### 2. `components/Feed.jsx`
The main dashboard with a glassmorphism sticky header and organic background blur decorations.
*   Polls the API for new content every 30s.
*   Manages "Edit" and "Delete" state using custom MD3 Dialogs.

### 3. `components/SightingCard.jsx`
An "Instagram-style" rich media card (4:5 aspect ratio).
*   **Swipe-able Carousel**: Toggle between AI-preview images and full HQ videos.
*   **Micro-interactions**: Subtle hover scale-ups and active scale-downs.

## 🚀 Usage Guide

### Installation
```bash
cd client
npm install
```

### Development
```bash
npm run dev
# Server running at http://localhost:5173
```

### Production Build
```bash
npm run build
```

## 🧪 Verification
1.  **MD3 Check**: Verify buttons are pill-shaped and cards have 24px rounded corners.
2.  **Interaction**: Hover over a card; it should scale up slightly (1.01x).
3.  **PWA Install**: Open in Chrome/Safari and look for "Install App".
4.  **Notifications**: Click the Bell icon. Ensure permission prompt appears.
