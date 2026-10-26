// The route of the start page at the site's root. A screen exports its routes from its route.tsx and the shell reads them
// (ARCHITECTURE.md section 3.2). This page is small and is the first one most visitors open, so it loads with the entry
// rather than lazily. The route has no guard and no loader that redirects (I5: nothing locks).

import type { RouteObject } from 'react-router'
import { Home } from './Home.tsx'

export const routes: RouteObject[] = [{ index: true, Component: Home }]

export default routes
