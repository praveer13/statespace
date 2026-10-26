// The route of SCR-claims (ARCHITECTURE.md section 3.2: /claims). The screen loads lazily on its first visit. The
// Mirror is never linked from here (DESIGN.md section 7.2).

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'claims',
    lazy: async () => {
      const { ClaimsScreen } = await import('./ClaimsScreen.tsx')
      return { Component: ClaimsScreen }
    },
  },
]

export default routes
