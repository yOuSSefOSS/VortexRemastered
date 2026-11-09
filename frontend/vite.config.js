import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [tailwindcss(), react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
                        return 'vendor-three';
                    }
                    if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
                        return 'vendor-charts';
                    }
                    if (id.includes('node_modules/jspdf')) {
                        return 'vendor-pdf';
                    }
                },
            },
        },
    },
});
