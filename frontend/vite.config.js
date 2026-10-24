import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // BACKEND: uncomment to proxy /api to the local backend during development,
    // then set VITE_API_BASE_URL to "" (same origin) in .env.local.
    // proxy: {
    //   "/api": { target: "http://localhost:4000", changeOrigin: true },
    // },
  },
});
