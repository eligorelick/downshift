import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // 'prompt' so an update waits for an idle moment instead of reloading mid-session (src/platform/updates.ts).
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Downshift',
        short_name: 'Downshift',
        description:
          'Focus blocks, rest timers and guided breathing, with optional live heart rate from a Bluetooth heart rate monitor.',
        theme_color: '#505e43',
        background_color: '#f4f1e8',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] },
    }),
  ],
  server: { port: 5173 },
})
