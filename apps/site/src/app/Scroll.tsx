import { useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router'

// The shell's scroll restoration. React Router's own <ScrollRestoration> passes location.hash to decodeURIComponent to
// find an anchor, and the main origin must never decode what a URL fragment carries (I6; GATE-bundle fragment.canary).
// This one looks the anchor up by the raw fragment, as SCR-receipt's #<sha256> needs, and decodes nothing:
//
//   back or forward    the position this entry had, when the session kept one;
//   a link with #id    the element whose id is exactly that text;
//   any other visit    the top of the page.

const KEY = 'statespace:scroll'

function saved(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(KEY)
    const parsed: unknown = raw === null ? null : JSON.parse(raw)
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function save(key: string, y: number): void {
  try {
    const all = saved()
    all[key] = y
    const keys = Object.keys(all)
    for (const k of keys.slice(0, Math.max(0, keys.length - 100))) delete all[k]
    sessionStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // no session storage: positions are not kept
  }
}

export function Scroll() {
  const location = useLocation()
  const kind = useNavigationType()

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  }, [])

  useLayoutEffect(() => {
    const y = kind === 'POP' ? saved()[location.key] : undefined
    if (y !== undefined) window.scrollTo(0, y)
    else if (location.hash.length > 1) document.getElementById(location.hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
    const key = location.key
    return () => save(key, window.scrollY)
  }, [location.key, location.hash, kind])

  return null
}
