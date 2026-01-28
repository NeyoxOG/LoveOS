
import { defineConfig } from 'vite';

export default defineConfig({
  // Base '/' ensures absolute paths work correctly on custom domains or root deployments
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Disables source maps for production to save space/security
  }
});
