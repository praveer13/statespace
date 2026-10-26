// The route of SCR-week (ARCHITECTURE.md section 3.2: /week). The screen loads lazily on its first visit.

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'week',
    lazy: async () => {
      const { WeekScreen } = await import('./WeekScreen.tsx')
      return { Component: WeekScreen }
    },
  },
]

export default routes
