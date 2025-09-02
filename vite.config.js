import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite'
import { resolve } from 'path';


export default defineConfig({
  plugins: [
    react(),
    tailwind(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),   // <-- this line makes "@/..." work
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: './index.html',  // Entry point for the Mindful landing page 
        newtab: './src/newtab.jsx', // Entry point for the new tab page
        popup: './src/popup.jsx',   // Entry point for the popup window
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