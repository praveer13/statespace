import { Link, NavLink, Outlet } from 'react-router'

// The interim shell (see router.tsx): "Skip to content" first, then the wordmark and the screens that exist so far, the
// page, and the footer with the license and the source (DESIGN.md section 7.2). The current page carries the ▸ pointer
// and a heavier weight, never color alone.
export function App() {
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="shell-head">
        <Link to="/" className="wordmark" aria-label="statespace, start page">
          <span className="mark" aria-hidden="true">
            S′
          </span>
          <span className="word">statespace</span>
        </Link>
        <nav aria-label="Main" className="shell-nav">
          <NavLink to="/" end>
            Start
          </NavLink>
          <NavLink to="/specimens">Specimens</NavLink>
        </nav>
      </header>
      <main id="main" className="shell-main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="shell-foot">
        <p>
          Code under the MIT license, content under CC BY 4.0.{' '}
          <a href="https://github.com/praveer13/statespace">Source on GitHub</a>.
        </p>
      </footer>
    </div>
  )
}
