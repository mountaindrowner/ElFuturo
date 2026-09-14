import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Deployed at https://<user>.github.io/ElFuturo/
export default defineConfig({
  base: "/ElFuturo/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "Púlpito",
        short_name: "Púlpito",
        description: "Formal Spanish for the pulpit",
        lang: "es-MX",
        start_url: "/ElFuturo/",
        scope: "/ElFuturo/",
        display: "standalone",
        background_color: "#0F1E3D",
        theme_color: "#0F1E3D",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "/ElFuturo/index.html"
      }
    })
  ]
});
