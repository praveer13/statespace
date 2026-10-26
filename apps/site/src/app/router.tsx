import { createBrowserRouter, type RouteObject } from 'react-router'
import { App } from './App.tsx'
import { NotFound } from '../screens/scaffold/NotFound.tsx'
import { ScreenLoading } from './ScreenLoading.tsx'

// Every screen exports its routes from src/screens/<name>/route.tsx (ARCHITECTURE.md section 3.2) and the shell discovers
// them here, so adding a screen never edits app/. The route files are small and load with the entry; a screen's own
// component loads lazily on its first visit. No route has a guard, a loader that redirects, or a precondition (invariant
// I5: nothing locks). The shell (App.tsx) carries the five destinations, search and settings; main.tsx installs the
// preferences, the service worker and the search shortcut.
const screens = import.meta.glob<{ routes: RouteObject[] }>('../screens/*/route.tsx', { eager: true })
// A lazy screen opened by a deep link shows a quiet placeholder inside the shell while its code loads, so the shell's
// masthead and footer paint at once (and React Router has a HydrateFallback for the first load).
const withFallback = (r: RouteObject): RouteObject => {
  const children = r.children?.map(withFallback)
  const lazy = r.lazy !== undefined && r.HydrateFallback === undefined && r.hydrateFallbackElement === undefined
  return { ...r, ...(lazy ? { HydrateFallback: ScreenLoading } : {}), ...(children !== undefined ? { children } : {}) } as RouteObject
}
const screenRoutes = Object.entries(screens)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([, screen]) => screen.routes)
  .map(withFallback)

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [...screenRoutes, { path: '*', element: <NotFound /> }],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)
