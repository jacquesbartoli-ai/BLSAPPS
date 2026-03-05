import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const secretPath = process.env.VITE_SECRET_PATH ?? "espace-bartoli-xxxxx";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.svg"],
      manifest: {
        name: "Bartoli - Gestion Charcuterie",
        short_name: "Bartoli PWA",
        theme_color: "#1D3A2F",
        background_color: "#F6F1E8",
        display: "standalone",
        start_url: `/${secretPath}/`,
        scope: `/${secretPath}/`,
        orientation: "portrait-primary",
        icons: [
          {
            src: "logo.svg",
            sizes: "512x512",
            type: "image/svg+xml"
          }
        ]
      }
    })
  ],
  base: `/${secretPath}/`
});
