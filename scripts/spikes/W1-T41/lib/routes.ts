// Which routes the gate tests. ARCHITECTURE.md section 3.2 lists the routes and spine section 11.2 asks for "Playwright
// route tests"; section 3.1 says a post-build step writes an index.html for every static route, so a deep link answers 200
// on a host that serves files and nothing else. The gate therefore finds routes in the build (every index.html is a route
// and gets the same tests, so a task that adds a screen needs no edit here) and also holds each delivered screen to having
// one: a screen folder with a route.tsx is a delivered screen, and its path must then be in the build.

import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { deliveredScreens } from './applicability.ts'

export interface RouteSpec {
  path: string
  /** The folder under apps/site/src/screens that builds it; null for the home route, which the scaffold already has. */
  screen: string | null
  owner: string
}

/** The routes of ARCHITECTURE.md section 3.2 that W1 builds, with the screen folder that makes each one real. */
export const ROUTE_TABLE: readonly RouteSpec[] = [
  { path: '/', screen: null, owner: 'W0-S12' },
  { path: '/boot', screen: 'boot', owner: 'W1-T09' },
  { path: '/today', screen: 'today', owner: 'W1-T08' },
  { path: '/week', screen: 'week', owner: 'W1-T08' },
  { path: '/stages', screen: 'stages', owner: 'W1-T02' },
  { path: '/search', screen: 'search', owner: 'W1-T02' },
  { path: '/bench', screen: 'bench', owner: 'W1-T31' },
  { path: '/audit', screen: 'audit', owner: 'W1-T32' },
  { path: '/claims', screen: 'claims', owner: 'W1-T15' },
  { path: '/specimens', screen: 'specimens', owner: 'W1-T16' },
  { path: '/mirror', screen: 'mirror', owner: 'W1-T07' },
  { path: '/settings', screen: 'settings', owner: 'W1-T20' },
  { path: '/receipts', screen: 'receipt', owner: 'W1-T14' },
]

/** The five destinations and search that the shell's navigation offers (spine section 0; DESIGN.md section 7.2). */
export const NAV_DESTINATIONS: readonly { name: RegExp; path: string }[] = [
  { name: /^today\b/i, path: '/today' },
  { name: /^stages\b/i, path: '/stages' },
  { name: /^bench\b/i, path: '/bench' },
  { name: /^audit\b/i, path: '/audit' },
  { name: /^claims\b/i, path: '/claims' },
]

/** Folders of a build that hold files for the app, not pages of it. */
const NOT_ROUTES = new Set(['assets', 'fonts', 'content', 'md', 'schemas', 'b', 'node_modules', '.vite'])

/** Routes in a site build: each directory with an index.html, and each top-level page other than index and 404. */
export function discoverRoutes(siteDir: string): string[] {
  const out: string[] = []
  const walk = (dir: string, route: string): void => {
    if (existsSync(join(dir, 'index.html'))) out.push(route === '' ? '/' : route)
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && !NOT_ROUTES.has(e.name) && !e.name.startsWith('.')) walk(join(dir, e.name), `${route}/${e.name}`)
    }
  }
  if (existsSync(siteDir)) walk(siteDir, '')
  if (existsSync(siteDir)) {
    for (const e of readdirSync(siteDir, { withFileTypes: true })) {
      if (e.isFile() && /\.html$/i.test(e.name) && e.name !== 'index.html' && e.name !== '404.html') out.push(`/${e.name.replace(/\.html$/i, '')}`)
    }
  }
  return [...new Set(out)].sort((a, b) => a.length - b.length || a.localeCompare(b))
}

export interface RoutePlan {
  /** Every route to test, in the order they run. */
  routes: { path: string; required: boolean; owner?: string }[]
  /** Delivered screens whose route has no page in the build. */
  missing: RouteSpec[]
}

export function planRoutes(root: string, siteDir: string): RoutePlan {
  const found = discoverRoutes(siteDir)
  const screens = new Set(deliveredScreens(root))
  const required = ROUTE_TABLE.filter((r) => r.screen === null || screens.has(r.screen))
  const missing = required.filter((r) => !found.includes(r.path))
  const routes = [
    ...required.filter((r) => found.includes(r.path)).map((r) => ({ path: r.path, required: true, owner: r.owner })),
    ...found.filter((p) => !required.some((r) => r.path === p)).map((p) => ({ path: p, required: false })),
  ]
  return { routes, missing }
}

/** A route's kind, for routes outside the table: its first segment and its depth (`/stages/S1/S1.L0` is `stages/3`). */
export function routeKind(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return `${segments[0] ?? ''}/${segments.length}`
}

/**
 * The routes the fragment canary loads (e2e/fragment.spec.ts): every route of ROUTE_TABLE that the build has, so `/receipts`,
 * the one main-origin route whose fragment names something (ARCHITECTURE.md section 3.2, `/receipts#{sha256}`), is never left
 * out, and of the build's other routes the first of each kind. Pages of one kind come from one screen (every lesson page from
 * the lesson screen), and a build that writes a page per lesson would otherwise cost the fast lane about a second a page.
 */
export function canaryRoutes(routes: readonly { path: string }[]): string[] {
  const table = new Set(ROUTE_TABLE.map((r) => r.path))
  const kinds = new Set<string>()
  const out: string[] = []
  for (const { path } of routes) {
    if (out.includes(path)) continue
    if (table.has(path)) out.push(path)
    else if (!kinds.has(routeKind(path))) {
      kinds.add(routeKind(path))
      out.push(path)
    }
  }
  return out
}
