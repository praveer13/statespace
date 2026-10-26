// The route of SCR-drawer (ARCHITECTURE.md section 3.2: /drawers/D-{nn}). The screen loads lazily on its first visit.
// A drawer is always open (spine section 3.12): no guard, no redirect.

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'drawers/:id',
    lazy: async () => {
      const { DrawerRoute } = await import('./DrawerRoute.tsx')
      return { Component: DrawerRoute }
    },
  },
]

export default routes
