// The routes of SCR-report: /report, the learner's claim graph as the exportable report, and /report/erosions/ER-n, one
// erosion event with its forecast. Both load lazily; neither has a guard (I5).

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'report',
    lazy: async () => {
      const { ReportScreen } = await import('./ReportScreen.tsx')
      return { Component: ReportScreen }
    },
  },
  {
    path: 'report/erosions/:id',
    lazy: async () => {
      const { ErosionScreen } = await import('./ErosionScreen.tsx')
      return { Component: ErosionScreen }
    },
  },
]

export default routes
