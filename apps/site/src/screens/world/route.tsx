// The route of SCR-clearinghouse (docs/WORLD.md section 6.2): /world, with /clearinghouse (ARCHITECTURE.md section 3.2)
// as the same screen. Always open (I5): no guard, no loader that redirects. The screen loads lazily on its first visit.

import type { RouteObject } from 'react-router'

const screen = async () => {
  const { WorldScreen } = await import('./WorldScreen.tsx')
  return { Component: WorldScreen }
}

export const routes: RouteObject[] = [
  { path: 'world', lazy: screen },
  { path: 'clearinghouse', lazy: screen },
]

export default routes
