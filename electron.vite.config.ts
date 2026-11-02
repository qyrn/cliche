import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'

const relaxCspForDevServer: Plugin = {
  name: 'relax-csp-for-dev-server',
  apply: 'serve',
  transformIndexHtml: (html) =>
    html.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'; connect-src ws:")
}

export default defineConfig({
  main: {},
  preload: {
    build: {
      isolatedEntries: true,
      rollupOptions: {
        input: {
          overlay: resolve(import.meta.dirname, 'src/preload/overlay.ts'),
          history: resolve(import.meta.dirname, 'src/preload/history.ts')
        },
        output: { format: 'cjs', entryFileNames: '[name].cjs' }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [relaxCspForDevServer],
    build: {
      rollupOptions: {
        input: {
          overlay: resolve(import.meta.dirname, 'src/renderer/overlay/index.html'),
          history: resolve(import.meta.dirname, 'src/renderer/history/index.html')
        }
      }
    }
  }
})
