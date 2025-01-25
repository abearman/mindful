import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        react()
    ],
    build: {
        rollupOptions: {
            input: {
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