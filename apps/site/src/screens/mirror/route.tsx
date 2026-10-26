// The route of SCR-mirror (ARCHITECTURE.md section 3.2: /mirror). A screen exports its routes from its route.tsx, and the shell
// (W1-T02) reads them: `routes` is a list of React Router route objects whose paths are relative to the shell's root route, so
// this one is /mirror, and the screen is loaded when the route is first visited, so it adds nothing to the entry chunk. The route
// has no guard and no loader that redirects (I5: nothing locks). The Mirror is reached from Today and never linked from Claims.

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'mirror',
    lazy: async () => {
      const { MirrorRoute } = await import('./MirrorRoute.tsx')
      return { Component: MirrorRoute }
    },
  },
]

export default routes
