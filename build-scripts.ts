import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url));

async function buildScripts() {
  // 构建 content script
  await build({
    plugins: [react()],
    configFile: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'src/content/index.tsx'),
        name: 'content',
        formats: ['iife'],
        fileName: () => 'content.js'
      },
      rollupOptions: {
        output: {
          entryFileNames: 'content.js',
          extend: true,
        }
      },
      outDir: 'dist',
      emptyOutDir: false,
    }
  })

  // 构建 background script
  await build({
    configFile: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'src/background/index.ts'),
        name: 'background',
        formats: ['iife'],
        fileName: () => 'background.js'
      },
      rollupOptions: {
        output: {
          entryFileNames: 'background.js',
          extend: true,
        }
      },
      outDir: 'dist',
      emptyOutDir: false,
    }
  })
}

buildScripts().catch(console.error)
