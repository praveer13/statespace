#!/usr/bin/env node
// After `vite build`: GitHub Pages serves 404.html for a path it has no file for, so a copy of index.html there lets a
// deep link (/lessons/S1.L2, /stages/S3) boot the app, whose router then shows the page. Every static route a screen
// declares (a `path: '...'` with no parameter in apps/site/src/screens/*/route.tsx) also gets its own
// <route>/index.html, so a deep link to it answers 200 on a host that serves files and nothing else (ARCHITECTURE.md
// section 3.1; GATE-bundle routes.present).
//
//   node scripts/site/postbuild.mjs [DIST]     DIST defaults to apps/site/dist

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
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

const screens = join(REPO, 'apps/site/src/screens')
const paths = new Set()
for (const e of readdirSync(screens, { withFileTypes: true })) {
  const file = join(screens, e.name, 'route.tsx')
  if (!e.isDirectory() || !existsSync(file)) continue
  for (const m of readFileSync(file, 'utf8').matchAll(/\bpath:\s*'([^']*)'/g)) {
    const p = m[1].replace(/^\/+|\/+$/g, '')
    if (p === '' || /[:*?]/.test(p)) continue
    paths.add(p)
  }
}
for (const p of [...paths].sort()) {
  const dir = join(dist, ...p.split('/'))
  mkdirSync(dir, { recursive: true })
  copyFileSync(index, join(dir, 'index.html'))
}
process.stdout.write(`postbuild: 404.html and ${paths.size} static route pages (${[...paths].sort().join(', ')})\n`)
