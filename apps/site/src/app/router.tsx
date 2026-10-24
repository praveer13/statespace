import { createBrowserRouter } from 'react-router'
import { App } from './App.tsx'
import { NotFound } from '../screens/scaffold/NotFound.tsx'
import { Scaffold } from '../screens/scaffold/Scaffold.tsx'

// No route has a guard, a loader that redirects, or a precondition (invariant I5: nothing locks). The route
// table of ARCHITECTURE.md section 3.2 arrives with the shell task (W1-T02); this one holds the two routes a
// static site needs to be deployable: the home screen and a not-found screen for any other path.
export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <Scaffold /> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)
