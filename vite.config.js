import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base: '/family-budget/',
      manifest: {
        name: 'Family Budget',
        short_name: 'Budget',
        description: 'Track your family income and expenses',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/family-budget/',
        scope: '/family-budget/',
        icons: [
          {
            src: '/family-budget/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/family-budget/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/family-budget/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/family-budget/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  base: '/family-budget/',
})
