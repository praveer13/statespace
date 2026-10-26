import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/router.tsx'
import { installSearchShortcut } from './screens/search/route.tsx'
import { installPrefs } from './storage/prefs.ts'
import { installServiceWorker } from './sw/register.ts'
import './styles/tokens.css'
import './styles.css'

// Before the first paint: the theme and motion preferences, the offline copy (or ?nosw=1), and Ctrl K / ⌘K for search.
installPrefs()
installServiceWorker()
installSearchShortcut()

const root = document.getElementById('root')
if (!root) throw new Error('index.html lost its #root element')
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
