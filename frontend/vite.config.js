import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    // Bind to all interfaces so the Vite dev server is reachable from the
    // host when running inside a Docker container.
    host: true,
    port: 5173,

    // Dev-time reverse proxy: any request to /api/* is forwarded to the
    // backend container. This means the React app can call fetch('/api/shorten')
    // in development and the browser never hits a CORS preflight — the proxy
    // rewrites the origin before the request leaves the Vite process.
    //
    // In production, Nginx handles the same job (see nginx.conf).
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
