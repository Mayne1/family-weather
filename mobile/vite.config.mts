import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL("../mobile-shell", import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    port: 4173,
    proxy: {
      "/api": {
        target: "https://thefamilyweather.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
