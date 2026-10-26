// The route of SCR-search (ARCHITECTURE.md section 3.2: /search). The screen loads lazily on its first visit. Route files
// load with the entry, so this one also carries the page-wide shortcut: Ctrl K or ⌘K opens search from any page (DESIGN.md,
// SCR-search), and "/" does too when no field has focus. main.tsx installs it.

import type { RouteObject } from 'react-router'

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (el === null || typeof el.closest !== 'function') return false
  return el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !== null
}

let installed = false
export function installSearchShortcut(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('keydown', (e) => {
    const chord = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k'
    const slash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(e.target)
    if (!chord && !slash) return
    e.preventDefault()
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    if (window.location.pathname === `${base}/search`) {
      document.getElementById('search-field')?.focus()
      return
    }
    // The router is loaded by now; importing it here (not at the top) keeps route files free of a cycle with it.
    void import('../../app/router.tsx').then(({ router }) => router.navigate('/search'))
  })
}


export const routes: RouteObject[] = [
  {
    path: 'search',
    lazy: async () => {
      const { SearchScreen } = await import('./SearchScreen.tsx')
      return { Component: SearchScreen }
    },
  },
]

export default routes
