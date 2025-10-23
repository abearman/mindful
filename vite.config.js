import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite'
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url'


export default defineConfig({
  base: "",  // important for extensions (relative URLs)
  plugins: [
    react(),
    tailwind(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),  // Entry point for the Mindful landing page 
        ManageAccount: resolve(__dirname, 'ManageAccount.html'),  // Entry point for Manage Account page
        NewTab: resolve(__dirname, 'NewTab.html'),  // Entry point for the new tab page
        PopUp: resolve(__dirname, 'PopUp.html'),   // Entry point for the popup window
      },
      output: {
        entryFileNames: '[name].js', // Maintain separate output files
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    outDir: 'dist', // Default output directory
    emptyOutDir: true, // Clean the output directory before each build
  },
});