import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'

// The shell (DESIGN.md section 7.2): "Skip to content" first; a top bar with the wordmark, and from 900 px the five
// destinations as text links; below 900 px the destinations move to a bottom bar of 56-px targets with an icon and a
// 12-px label, the Bench captioned "laptop"; the page; and the footer with the license and the source. The current
// destination carries a heavy rule beneath it and a heavier weight, never color alone. Only one of the two bars is shown at a
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

/** A printed address (S5, S5.L3, D-12, LAB-5) to its page, or null when the text is not an address. */
export function addressPath(text: string): string | null {
  const t = text.trim().toUpperCase().replace(/\s+/g, '')
  if (/^S\d{1,2}$/.test(t)) return `/stages/${t}`
  if (/^S\d{1,2}\.L\d{1,2}$/.test(t)) return `/lessons/${t}`
  if (/^D-\d{1,3}$/.test(t)) return `/drawers/${t}`
  if (/^LAB-\d{1,2}$/.test(t)) return `/labs/${t}`
  return null
}

/** Go to an address: every stage, lesson, drawer and lab carries one, printed beside it; type it and press Enter. */
function GoTo() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [wrong, setWrong] = useState(false)
  const go = (e: FormEvent) => {
    e.preventDefault()
    const to = addressPath(text)
    if (to === null) {
      setWrong(true)
      return
    }
    setWrong(false)
    setText('')
    navigate(to)
  }
  return (
    <form className="goto" role="search" aria-label="Go to an address" onSubmit={go}>
      <label className="goto-label" htmlFor="goto-field">
        Go to
      </label>
      <input
        id="goto-field"
        className="goto-field"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setWrong(false)
        }}
        placeholder="S5.L3"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={wrong || undefined}
        aria-describedby={wrong ? 'goto-help' : undefined}
      />
      <span id="goto-help" className="goto-help" role="status">
        {wrong ? 'Addresses look like S5, S5.L3, D-12 or LAB-5.' : ''}
      </span>
    </form>
  )
}

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
        <GoTo />
      </header>
      <main id="main" className="shell-main" tabIndex={-1} data-bleed={pathname === '/' || pathname === '/stages' || pathname.startsWith('/stages/') ? 'true' : undefined}>
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
