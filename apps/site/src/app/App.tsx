import type { ReactNode } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router'

// The shell (DESIGN.md section 7.2): "Skip to content" first; a top bar with the wordmark, and from 900 px the five
// destinations as text links; below 900 px the destinations move to a bottom bar of 56-px targets with an icon and a
// 12-px label, the Bench captioned "laptop"; the page; and the footer with the license and the source. The current
// destination carries the ▸ pointer and a heavier weight, never color alone. Only one of the two bars is shown at a
// width, so assistive technology meets one navigation landmark.

interface Destination {
  readonly to: string
  readonly label: string
  readonly caption?: string
  /** The paths that belong to the destination (DESIGN.md section 7.3). */
  readonly owns: readonly string[]
  readonly icon: ReactNode
}

const svg = (children: ReactNode) => (
  <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    {children}
  </svg>
)

const DESTINATIONS: readonly Destination[] = [
  {
    to: '/today',
    label: 'Today',
    owns: ['/today', '/mirror', '/week'],
    icon: svg(
      <>
        <rect x="4" y="5" width="16" height="15" rx="1" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </>,
    ),
  },
  {
    to: '/stages',
    label: 'Stages',
    owns: ['/stages', '/lessons', '/drawers'],
    icon: svg(
      <>
        <path d="M6 4v16" />
        <circle cx="6" cy="6" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="6" cy="18" r="2" />
        <path d="M11 6h9M11 12h9M11 18h9" />
      </>,
    ),
  },
  {
    to: '/bench',
    label: 'Bench',
    caption: 'laptop',
    owns: ['/bench', '/labs', '/receipts'],
    icon: svg(
      <>
        <rect x="5" y="5" width="14" height="10" rx="1" />
        <path d="M3 19h18M8 15l-2 4M16 15l2 4" />
      </>,
    ),
  },
  {
    to: '/audit',
    label: 'Audit',
    owns: ['/audit'],
    icon: svg(
      <>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="M15 15l5 5" />
      </>,
    ),
  },
  {
    to: '/claims',
    label: 'Claims',
    owns: ['/claims', '/specimens'],
    icon: svg(
      <>
        <rect x="5" y="3" width="14" height="18" rx="1" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>,
    ),
  },
]

const owner = (path: string): Destination | undefined => DESTINATIONS.find((d) => d.owns.some((p) => path === p || path.startsWith(`${p}/`)))

function Destinations({ where, className }: { readonly where: string; readonly className: string }) {
  const current = owner(where)
  return (
    <ul className={className}>
      {DESTINATIONS.map((d) => (
        <li key={d.to}>
          <Link to={d.to} aria-current={current === d ? (where === d.to ? 'page' : 'true') : undefined}>
            {d.icon}
            <span className="nav-label">{d.label}</span>
            {d.caption !== undefined ? <span className="nav-caption">{d.caption}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function App() {
  const { pathname } = useLocation()
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="shell-head">
        <Link to="/" className="wordmark">
          <span className="mark" aria-hidden="true">
            S′
          </span>
          <span className="word">statespace</span>
          <span className="visually-hidden">, start page</span>
        </Link>
        <nav aria-label="Main" className="nav-top">
          <Destinations where={pathname} className="nav-list" />
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
      <nav aria-label="Main" className="nav-bottom">
        <Destinations where={pathname} className="nav-list" />
      </nav>
      <ScrollRestoration />
    </div>
  )
}
