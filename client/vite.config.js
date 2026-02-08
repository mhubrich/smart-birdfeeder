import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Smart Birdfeeder',
        short_name: 'Birdfeeder',
        description: 'Watch your birds!',
        theme_color: '#ffffff',
        display: 'standalone', // Critical for iOS
        icons: [
          {
            src: 'pwa-192x192.png', // User needs to provide these or I'll use placeholders logic if I had a generator tool
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:3100',
        changeOrigin: true
      }
    }
  }
})
