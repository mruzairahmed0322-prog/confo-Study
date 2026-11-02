import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const vendorChunkPackages = ['react', 'react-dom', 'scheduler'] as const;

const lazyChunkMatchers: Array<{ chunk: string; patterns: string[] }> = [
    { chunk: 'query', patterns: ['@tanstack/react-query'] },
    { chunk: 'charts', patterns: ['recharts'] },
];

export default defineConfig({
    server: {
        host: '127.0.0.1',
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'resources/js'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return;
                    }

                    for (const { chunk, patterns } of lazyChunkMatchers) {
                        if (patterns.some((pattern) => id.includes(pattern))) {
                            return chunk;
                        }
                    }

                    if (vendorChunkPackages.some((pkg) => id.includes(pkg))) {
                        return 'vendor';
                    }
                },
            },
        },
    },
});
