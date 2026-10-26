import { createBrowserRouter, type RouteObject } from 'react-router'
import { App } from './App.tsx'
import { NotFound } from '../screens/scaffold/NotFound.tsx'

// Every screen exports its routes from src/screens/<name>/route.tsx (ARCHITECTURE.md section 3.2) and the shell discovers
// them here, so adding a screen never edits app/. The route files are small and load with the entry; a screen's own
// component loads lazily on its first visit. No route has a guard, a loader that redirects, or a precondition (invariant
// I5: nothing locks). This is the interim shell that put the first build online; W1-T02 replaces it with the full shell
// (the five destinations, search, settings and the service worker).
const screens = import.meta.glob<{ routes: RouteObject[] }>('../screens/*/route.tsx', { eager: true })
const screenRoutes = Object.entries(screens)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([, screen]) => screen.routes)

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
