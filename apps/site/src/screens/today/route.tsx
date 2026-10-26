// The route of SCR-today (ARCHITECTURE.md section 3.2: /today). The screen loads lazily on its first visit.

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'today',
    lazy: async () => {
      const { TodayScreen } = await import('./TodayScreen.tsx')
      return { Component: TodayScreen }
    },
  },
]

export default routes
