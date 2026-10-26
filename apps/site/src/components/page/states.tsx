// The states a screen passes through while its content loads: loading, failed, and nothing at that address.

import { Link } from 'react-router'
import { useTitle } from '../../app/title.ts'

export function Loading({ what }: { readonly what: string }) {
  return (
    <p className="status" role="status">
      Loading {what}…
    </p>
  )
}

export function Failed({ message }: { readonly message: string }) {
  useTitle('Could not load')
  return (
    <article className="screen">
      <header className="screen-head">
        <h1>This page could not load</h1>
      </header>
      <p className="lede">The course's content did not arrive ({message}). Check the connection and reload the page.</p>
    </article>
  )
}

export function Missing({ what, id }: { readonly what: string; readonly id: string }) {
  useTitle('Not found')
  return (
    <article className="screen">
      <header className="screen-head">
        <h1>Not found</h1>
      </header>
      <p className="lede">
        The course has no {what} called {id}. <Link to="/stages">See every stage.</Link>
      </p>
    </article>
  )
}
