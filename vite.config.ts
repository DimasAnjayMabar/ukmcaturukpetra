import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  server: {
    host: true,      // or "0.0.0.0" → listen on all network interfaces
    port: 5173,      // optional, default is 5173
     allowedHosts: [
      "d53b6e68ccbb.ngrok-free.app", // ← copy your current ngrok subdomain
    ],
  },
});