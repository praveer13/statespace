import { Link } from 'react-router'
import { useTitle } from '../../app/title.ts'

export function NotFound() {
  useTitle('Not found')
  return (
    <article className="screen">
      <header className="screen-head">
        <h1>Not found</h1>
      </header>
      <p className="lede">
        There is nothing at this address. <Link to="/">Go to the start.</Link>
      </p>
    </article>
  )
}
