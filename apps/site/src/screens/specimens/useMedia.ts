// Whether a media query matches, as React reads an outside store: false where there is no window (a static render, a test),
// so the narrow layout, which hides nothing the wide one shows, is the one that renders first.

import { useSyncExternalStore } from 'react'

export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
