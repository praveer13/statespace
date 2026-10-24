import { Link } from 'react-router'

export function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        There is nothing at this address. <Link to="/">Go to the start.</Link>
      </p>
    </>
  )
}
