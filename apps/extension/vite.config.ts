import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      generateBundle() {
        // Copy manifest.json
        copyFileSync(
          resolve(__dirname, 'src/manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );

        // Copy icons directory
        const iconsDir = resolve(__dirname, 'dist/icons');
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }

        // Copy each icon file
        const iconSizes = ['16', '32', '48', '128'];
        iconSizes.forEach((size) => {
          const srcIcon = resolve(__dirname, `public/icons/icon-${size}.svg`);
          const destIcon = resolve(__dirname, `dist/icons/icon-${size}.svg`);
          if (existsSync(srcIcon)) {
            copyFileSync(srcIcon, destIcon);
          }
        });

        // Copy HTML files to root if they're in subdirectories
        const htmlFiles = ['popup.html', 'options.html'];
        htmlFiles.forEach((filename) => {
          const srcPath = resolve(
            __dirname,
            `dist/src/${filename.replace('.html', '')}/index.html`
          );
          const destPath = resolve(__dirname, `dist/${filename}`);
          if (existsSync(srcPath)) {
            copyFileSync(srcPath, destPath);
          }
        });
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.html')) {
            // Output HTML files at root
            return '[name].[ext]';
          }
          return '[name].[ext]';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
