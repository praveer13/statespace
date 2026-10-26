// The W1-T16 verification harness: builds the real specimen screen, and the real route over the real IndexedDB adapter, with
// the site's public directory (the font subsets) and a project base path, as a deploy would.
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))
export default defineConfig({
  root: here,
  base: process.env.HARNESS_BASE ?? '/statespace/',
  publicDir: path.resolve(here, '../../../../apps/site/public'),
  plugins: [react()],
  build: { outDir: process.env.HARNESS_OUT, emptyOutDir: true, target: 'es2022' },
  logLevel: 'warn',
})
