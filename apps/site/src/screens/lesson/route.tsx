// The route of SCR-lesson (ARCHITECTURE.md section 3.2: /lessons/S{n}.L{k}). The screen loads lazily on its first visit.
// No guard and no redirect (I5: nothing locks): a lesson that is not written yet still opens, and says so.

import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    path: 'lessons/:id',
    lazy: async () => {
      const { LessonRoute } = await import('./LessonRoute.tsx')
      return { Component: LessonRoute }
    },
  },
]

export default routes
