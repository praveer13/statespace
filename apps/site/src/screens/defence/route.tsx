// The routes of SCR-defence (spine section 8.6): /defence/S{n}, a stage's Defence, and /defence, the list of them.
// Both load lazily on a first visit. No route has a guard (I5: nothing locks): every stage's Defence opens.

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'defence',
    lazy: async () => {
      const { DefenceIndex } = await import('./DefenceIndex.tsx')
      return { Component: DefenceIndex }
    },
  },
  {
    path: 'defence/:stage',
    lazy: async () => {
      const { DefenceScreen } = await import('./DefenceScreen.tsx')
      return { Component: DefenceScreen }
    },
  },
]

export default routes
