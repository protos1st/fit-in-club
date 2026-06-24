import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true // listen on all network interfaces (0.0.0.0), not just localhost,
               // so other devices on the same Wi-Fi can reach the dev server
  }
});
