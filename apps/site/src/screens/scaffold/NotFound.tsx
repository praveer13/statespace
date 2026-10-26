import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { addressPath } from '../../app/App.tsx'
import { useTitle } from '../../app/title.ts'
import './scaffold.css'

// Not found: a gap on the shelf. The page says plainly that nothing stands at this address, shows the address that was
// asked for, and teaches the course's printed addresses, with a field that reads an address back as it is typed (the
// masthead's Go-to field shows only from 900 px, so phones get one here too).

/** The four kinds of printed address, each with a real example. A stage's items carry its volume ink; a drawer has none. */
const FORMS = [
  { example: 'S5', kind: 'A stage', reads: 'Volume 5 of the series: its cover, its colophon, its lessons.', ink: 'var(--vol-5)', stage: 'S5' },
  { example: 'S5.L3', kind: 'A lesson', reads: 'Stage 5, lesson 3. L0 is the boot lesson of a stage.', ink: 'var(--vol-5)', stage: 'S5' },
  { example: 'D-12', kind: 'A drawer', reads: 'An appendix beside the lessons, numbered across the course.', ink: 'var(--vol-10)', stage: null },
  { example: 'LAB-5', kind: 'A lab', reads: 'The bench work for stage 5, done on a laptop.', ink: 'var(--vol-5)', stage: 'S5' },
] as const

/** What a typed address means, in words, or null when it is not one. */
function reading(text: string): string | null {
  const t = text.trim().toUpperCase().replace(/\s+/g, '')
  let m: RegExpExecArray | null
  if ((m = /^S(\d{1,2})$/.exec(t)) !== null) return `a stage, volume ${Number(m[1])}`
  if ((m = /^S(\d{1,2})\.L(\d{1,2})$/.exec(t)) !== null) return `a lesson, stage ${Number(m[1])} lesson ${Number(m[2])}`
  if ((m = /^D-(\d{1,3})$/.exec(t)) !== null) return `a drawer, number ${Number(m[1])}`
  if ((m = /^LAB-(\d{1,2})$/.exec(t)) !== null) return `a lab, the bench work for stage ${Number(m[1])}`
  return null
}

/** The address a mistyped path may have meant: its last part, when that is a printed address (/s5.l3, /lesson/S5.L3). */
function meant(pathname: string): { readonly text: string; readonly to: string } | null {
  let last = pathname.split('/').filter((p) => p !== '').pop() ?? ''
  try {
    last = decodeURIComponent(last)
  } catch {
    return null
  }
  const to = addressPath(last)
  return to === null || to === pathname ? null : { text: last.trim().toUpperCase().replace(/\s+/g, ''), to }
}

/** Ten volumes standing on a board, the fifth missing: the gap is what this page is. */
function Shelf() {
  const heights = [62, 70, 58, 74, 0, 66, 60, 72, 64, 68]
  return (
    <svg className="nf-shelf" viewBox="0 0 216 96" aria-hidden="true" focusable="false">
      {heights.map((h, i) => {
        const x = 3 + i * 21
        return h === 0 ? (
          <rect key={i} className="nf-gap" x={x + 0.75} y={22.75} width={16.5} height={64.5} />
        ) : (
          <g key={i}>
            <rect className="nf-spine" x={x} y={88 - h} width={18} height={h} style={{ fill: `var(--vol-${i + 1})` } as CSSProperties} />
            <rect className="nf-band" x={x} y={88 - h + 8} width={18} height={3} />
          </g>
        )
      })}
      <rect className="nf-board" x={0} y={88} width={216} height={3} />
    </svg>
  )
}

function Field() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [wrong, setWrong] = useState(false)
  const read = reading(text)
  const go = (e: FormEvent) => {
    e.preventDefault()
    const to = addressPath(text)
    if (to === null) {
      setWrong(true)
      return
    }
    navigate(to)
  }
  return (
    <form className="nf-form" onSubmit={go} noValidate>
      <label className="nf-label" htmlFor="nf-field">
        Address
      </label>
      <div className="nf-row">
        <input
          id="nf-field"
          className="nf-field"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setWrong(false)
          }}
          placeholder="S5.L3"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={wrong || undefined}
          aria-describedby="nf-reads nf-help"
        />
        <button type="submit" className="nf-go">
          Go
        </button>
      </div>
      <p id="nf-reads" className="nf-reads" data-read={read !== null ? 'true' : undefined}>
        {text.trim() === '' ? 'Type an address and this line reads it back.' : read !== null ? `Reads as ${read}.` : 'Not an address yet.'}
      </p>
      <p id="nf-help" className="nf-help" role="status">
        {wrong ? 'Addresses look like S5, S5.L3, D-12 or LAB-5.' : ''}
      </p>
    </form>
  )
}

export function NotFound() {
  useTitle('Not found')
  const { pathname } = useLocation()
  const guess = meant(pathname)
  return (
    <article className="screen nf">
      <header className="nf-head">
        <div className="nf-head-text">
          <h1>Not found</h1>
          <p className="nf-lede">
            There is nothing at this address. <Link to="/">Go to the start.</Link>
          </p>
          <p className="nf-asked">
            You asked for <code>{pathname}</code>
          </p>
          {guess !== null ? (
            <p className="nf-meant">
              <code>{guess.text}</code> is a printed address. <Link to={guess.to}>Open {guess.text}</Link>
            </p>
          ) : null}
        </div>
        <Shelf />
      </header>

      <section className="nf-goto" aria-labelledby="nf-goto-h">
        <h2 id="nf-goto-h">Go to an address</h2>
        <p className="nf-note">Every stage, lesson, drawer and lab carries an address, printed beside it. Type one to go straight there.</p>
        <Field />
      </section>

      <section className="nf-forms" aria-labelledby="nf-forms-h">
        <h2 id="nf-forms-h">How an address reads</h2>
        <ul className="nf-list">
          {FORMS.map((f) => (
            <li key={f.example} className="nf-item">
              <Link to={addressPath(f.example) ?? '/'} className="nf-addr">
                <span className="nf-swatch" style={{ background: f.ink } as CSSProperties} aria-hidden="true" />
                <code>{f.example}</code>
              </Link>
              <span className="nf-kind">
                {f.kind}
                <span className="nf-stage">{f.stage !== null ? ` · ${f.stage}` : ' · no volume'}</span>
              </span>
              <span className="nf-what">{f.reads}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
