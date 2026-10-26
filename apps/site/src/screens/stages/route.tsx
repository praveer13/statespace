// The routes of SCR-stages and SCR-stage (ARCHITECTURE.md section 3.2: /stages and /stages/S{n}). Both screens load
// lazily on a first visit. Nothing locks: every stage opens (I5).

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'stages',
    lazy: async () => {
      const { StagesScreen } = await import('./StagesScreen.tsx')
      return { Component: StagesScreen }
    },
  },
  {
    path: 'stages/:stage',
    lazy: async () => {
      const { StageScreen } = await import('./StageScreen.tsx')
      return { Component: StageScreen }
    },
  },
]

export default routes
