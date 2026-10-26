// The route of SCR-bench (ARCHITECTURE.md section 3.2: /bench). The screen loads lazily on its first visit.

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'bench',
    lazy: async () => {
      const { BenchScreen } = await import('./BenchScreen.tsx')
      return { Component: BenchScreen }
    },
  },
]

export default routes
