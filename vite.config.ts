import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import legacy from '@vitejs/plugin-legacy';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    legacy({
      targets: ['ios >= 12', 'safari >= 12', 'chrome >= 60', 'firefox >= 60'],
      polyfills: ['es.promise', 'es.array.iterator'],
      modernPolyfills: true
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['zod', '@hookform/resolvers/zod', 'react-hook-form'],
  },
  build: {
    target: ['ios12', 'safari12'],
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          form: ['zod', '@hookform/resolvers/zod', 'react-hook-form'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-label']
        }
      },
    },
  },
  // Add proper configuration for SPA routing in production
  preview: {
    port: 8080,
    host: true,
  },
}));
