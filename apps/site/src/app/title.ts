import { useEffect } from 'react'

/** Sets the document's title for the screen: "‹subject› · statespace", or "statespace" alone. */
export function useTitle(subject: string | undefined): void {
  useEffect(() => {
    document.title = subject === undefined || subject === '' ? 'statespace' : `${subject} · statespace`
  }, [subject])
}
