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
      targets: ['ios >= 12', 'safari >= 12'],
      modernPolyfills: true,
      renderLegacyChunks: true,
      polyfills: [
        'es.symbol',
        'es.array.filter',
        'es.promise',
        'es.promise.finally',
        'es/map',
        'es/set',
        'es.array.for-each',
        'es.array.iterator',
        'es.array.map',
        'es.object.assign',
        'es.object.keys',
        'es.string.iterator',
        'web.dom-collections.iterator',
        'es.array.includes',
        'es.string.includes'
      ]
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
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      parse: {
        ecma: 2015
      },
      compress: {
        ecma: 5,
        warnings: false,
        comparisons: false,
        inline: 2
      },
      mangle: {
        safari10: true
      },
      output: {
        ecma: 5,
        comments: false,
        ascii_only: true
      }
    },
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
