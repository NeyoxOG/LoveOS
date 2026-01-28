
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Root directory is current directory
  root: '.',
  base: '/',
  define: {
    // Prevent "process is not defined" errors in browser
    'process.env': {} 
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    host: true
  }
});
