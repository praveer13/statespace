// The routes of SCR-specimens (ARCHITECTURE.md section 3.2: /specimens). A screen exports its routes from its route.tsx,
// and the shell (W1-T02) reads them: `routes` is a list of React Router route objects whose paths are relative to the
// shell's root route, so this one is /specimens, and the screen is loaded when the route is first visited, so it adds
// nothing to the entry chunk. The route has no guard and no loader that redirects (I5: nothing locks).

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'specimens',
    lazy: async () => {
      const { SpecimensRoute } = await import('./SpecimensRoute.tsx')
      return { Component: SpecimensRoute }
    },
  },
]

export default routes
