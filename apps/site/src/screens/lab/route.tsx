// The route of SCR-lab (ARCHITECTURE.md section 3.2: /labs/LAB-{n}). The screen loads lazily on its first visit.

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'labs/:lab',
    lazy: async () => {
      const { LabScreen } = await import('./LabScreen.tsx')
      return { Component: LabScreen }
    },
  },
]

export default routes
