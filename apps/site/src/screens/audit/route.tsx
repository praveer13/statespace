// The routes of SCR-audit (ARCHITECTURE.md section 3.2: /audit): the Desk itself, a session the learner starts
// (/audit/session?seed=&n=, so a reload draws the same session), and any single case, always open (I5: nothing locks;
// /audit/case/AUD-1.1/3 numbers an anchor's cases in an order that does not reveal which is which). Each screen loads
// lazily on its first visit.

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'audit',
    lazy: async () => {
      const { AuditScreen } = await import('./AuditScreen.tsx')
      return { Component: AuditScreen }
    },
  },
  {
    path: 'audit/session',
    lazy: async () => {
      const { SessionScreen } = await import('./SessionScreen.tsx')
      return { Component: SessionScreen }
    },
  },
  {
    path: 'audit/case/:anchor/:n',
    lazy: async () => {
      const { CaseScreen } = await import('./CaseScreen.tsx')
      return { Component: CaseScreen }
    },
  },
]

export default routes
