#!/usr/bin/env node
// After `vite build`: GitHub Pages serves 404.html for a path it has no file for, so a copy of index.html there lets a
// deep link (/lessons/S1.L2, /stages/S3) boot the app, whose router then shows the page.
//
//   node scripts/site/postbuild.mjs [DIST]     DIST defaults to apps/site/dist

import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const dist = resolve(process.argv[2] ?? join(REPO, 'apps/site/dist'))
const index = join(dist, 'index.html')
if (!existsSync(index)) {
  process.stderr.write(`postbuild: ${index} is missing; run vite build first\n`)
  process.exit(1)
}
copyFileSync(index, join(dist, '404.html'))
