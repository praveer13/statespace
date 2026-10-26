// The route of SCR-settings (ARCHITECTURE.md section 3.2: /settings). The screen loads lazily on its first visit. The
// appearance preferences and the service worker are installed by main.tsx, before the first paint.

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'settings',
    lazy: async () => {
      const { SettingsScreen } = await import('./SettingsScreen.tsx')
      return { Component: SettingsScreen }
    },
  },
]

export default routes
