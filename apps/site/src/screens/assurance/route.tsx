// The route of SCR-assurance (/assurance): what the course claims about itself, stamped by the learner's rules. It loads
// lazily and has no guard (I5).

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'assurance',
    lazy: async () => {
      const { AssuranceScreen } = await import('./AssuranceScreen.tsx')
      return { Component: AssuranceScreen }
    },
  },
]

export default routes
