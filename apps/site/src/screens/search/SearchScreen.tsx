import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import type { SearchEntry } from '@statespace/content'
import { claimName, loadSearch, specimenName, useLoaded } from '../../app/content.ts'
import { useTitle } from '../../app/title.ts'
import { group, prepare, rank, type Hit } from './rank.ts'
import './search.css'

// SCR-search (DESIGN.md section 8, SCR-search): the field on top, results grouped by kind, each group labelled, and the
// recent searches kept on this device. Keyboard first: the field is focused on arrival, the arrow keys move through the
// results, Enter opens the one marked, Escape clears the field and, on an empty field, goes back to where the reader was.
// Ctrl K or ⌘K opens this page from anywhere (route.tsx). The index is the content build's static file: no request
// leaves the page while you type.

const RECENT_KEY = 'statespace.search.recent'
const RECENT_MAX = 6
const PER_GROUP = 8

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

function keepRecent(q: string): void {
  const t = q.trim()
  if (t === '') return
  try {
    const next = [t, ...readRecent().filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // a refusing storage: nothing is remembered
  }
}

function forgetRecent(): void {
  try {
    localStorage.removeItem(RECENT_KEY)
  } catch {
    // nothing to forget
  }
}

const titleOf = (e: SearchEntry): string => {
  if (e.kind === 'claim') return claimName(e.id) ?? e.title
  if (e.kind === 'specimen') return specimenName(e.id) ?? e.title
  return e.title
}

/** Where a hit opens: a specimen or a claim opens its screen at its own row. */
const hrefOf = (e: SearchEntry): string => (e.kind === 'specimen' || e.kind === 'claim' || e.kind === 'anchor' ? `${e.href}#${encodeURIComponent(e.id)}` : e.href)

const stageInk = (stage: string | undefined): CSSProperties | undefined => {
  const n = stage === undefined ? NaN : Number(/^S(\d+)$/.exec(stage)?.[1])
  return Number.isFinite(n) ? ({ '--hit-ink': `var(--vol-${n})` } as CSSProperties) : undefined
}

const EXAMPLES = ['SP-5.1', 'fairness', 'weakest precondition', 'D-12', 'serializable']

export function SearchScreen() {
  useTitle('Search')
  const [params, setParams] = useSearchParams()
  // The field owns the text; the address follows it (replace, so typing adds no history), and a link with ?q= seeds it.
  const [query, setQueryText] = useState(() => params.get('q') ?? '')
  const navigate = useNavigate()
  const field = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const [recent, setRecent] = useState<string[]>(readRecent)
  const loaded = useLoaded(loadSearch, [])

  const index = useMemo(() => (loaded.status === 'ready' ? prepare(loaded.value.entries, titleOf) : []), [loaded])
  const hits = useMemo(() => rank(index, query), [index, query])
  const groups = useMemo(() => group(hits), [hits])
  const shown = useMemo(() => groups.map((g) => ({ ...g, visible: open.has(g.kind) ? g.hits : g.hits.slice(0, PER_GROUP) })), [groups, open])
  const flat = useMemo(() => shown.flatMap((g) => g.visible), [shown])

  useEffect(() => {
    field.current?.focus()
  }, [])
  useEffect(() => {
    setActive(0)
    setOpen(new Set())
  }, [query])

  const setQuery = (q: string) => setQueryText(q)
  const leaving = useRef(false)
  useEffect(() => {
    const t = setTimeout(() => {
      if (!leaving.current) setParams(query === '' ? {} : { q: query }, { replace: true })
    }, 250)
    return () => clearTimeout(t)
  }, [query, setParams])

  const go = (hit: Hit) => {
    leaving.current = true
    keepRecent(query)
    navigate(hrefOf(hit.entry))
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (flat.length === 0 ? 0 : (a + 1) % flat.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (flat.length === 0 ? 0 : (a - 1 + flat.length) % flat.length))
    } else if (e.key === 'Enter') {
      const hit = flat[active]
      if (hit !== undefined) {
        e.preventDefault()
        go(hit)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (query !== '') setQuery('')
      else if (window.history.length > 1) navigate(-1)
    }
  }

  useEffect(() => {
    document.getElementById(`hit-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const activeId = flat[active] !== undefined && query !== '' ? `hit-${active}` : undefined
  let n = -1

  return (
    <article className="screen search">
      <header className="search-head">
        <h1>Search</h1>
        <p className="search-lede">Every stage, lesson, drawer, KC, specimen, claim and lab in the course, by its address or its words.</p>
      </header>

      <div className="search-box" role="search">
        <label className="search-label" htmlFor="search-field">
          Find
        </label>
        <input
          ref={field}
          id="search-field"
          className="search-field"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="SP-5.1, fairness, S4.L3"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={query !== '' && flat.length > 0}
          aria-controls="search-results"
          aria-activedescendant={activeId}
          aria-describedby="search-keys search-count"
        />
        <p id="search-keys" className="search-keys">
          <kbd>↑</kbd> <kbd>↓</kbd> move · <kbd>Enter</kbd> opens · <kbd>Esc</kbd> clears, then goes back · <kbd>Ctrl</kbd> <kbd>K</kbd> from any page
        </p>
      </div>

      <p id="search-count" className="search-count" role="status" aria-live="polite">
        {loaded.status === 'loading'
          ? 'Reading the index.'
          : loaded.status === 'error'
            ? 'The search index did not load. Reload the page to try again.'
            : query.trim() === ''
              ? `${index.length} entries in the index.`
              : hits.length === 0
                ? `Nothing in the index matches “${query.trim()}”.`
                : `${hits.length} ${hits.length === 1 ? 'match' : 'matches'} in ${groups.length} ${groups.length === 1 ? 'group' : 'groups'}.`}
      </p>

      {query.trim() === '' ? (
        <section className="search-idle" aria-labelledby="search-recent-h">
          {recent.length > 0 ? (
            <>
              <div className="search-idle-head">
                <h2 id="search-recent-h">Recent on this device</h2>
                <button
                  type="button"
                  className="search-forget"
                  onClick={() => {
                    forgetRecent()
                    setRecent([])
                  }}
                >
                  Forget these
                </button>
              </div>
              <ul className="search-chips">
                {recent.map((r) => (
                  <li key={r}>
                    <button type="button" className="search-chip" onClick={() => setQuery(r)}>
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <h2 id="search-recent-h">Try</h2>
          )}
          {recent.length === 0 ? (
            <ul className="search-chips">
              {EXAMPLES.map((r) => (
                <li key={r}>
                  <button type="button" className="search-chip" onClick={() => setQuery(r)}>
                    {r}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : hits.length === 0 && loaded.status === 'ready' ? (
        <p className="search-none">
          Addresses look like <code>S5.L3</code>, <code>D-12</code>, <code>SP-5.1</code> or <code>CL-2.1</code>. A topic the course defers still has its drawer, so try a shorter word.
        </p>
      ) : (
        <div id="search-results" className="search-results" role="listbox" aria-label="Results">
          {shown.map((g) => (
            <div key={g.kind} role="group" aria-labelledby={`group-${g.kind}`} className="search-group">
              <h2 id={`group-${g.kind}`} className="search-group-h" role="presentation">
                {g.label} <span className="search-group-n">{g.hits.length}</span>
              </h2>
              <ul className="search-hits" role="presentation">
                {g.visible.map((h) => {
                  n += 1
                  const i = n
                  return (
                    <li key={`${h.entry.kind}:${h.entry.id}`} role="presentation">
                      <Link
                        id={`hit-${i}`}
                        role="option"
                        aria-selected={i === active}
                        to={hrefOf(h.entry)}
                        className="search-hit"
                        data-active={i === active ? 'true' : undefined}
                        tabIndex={-1}
                        onMouseMove={() => setActive(i)}
                        onClick={() => {
                          leaving.current = true
                          keepRecent(query)
                        }}
                      >
                        <span className="search-hit-id">
                          {h.entry.stage !== undefined ? <span className="search-ink" style={stageInk(h.entry.stage)} aria-hidden="true" /> : null}
                          <code>{h.entry.id}</code>
                        </span>
                        <span className="search-hit-title">{h.title}</span>
                        {h.entry.text !== '' && h.entry.text !== h.entry.id ? <span className="search-hit-text">{h.entry.text}</span> : null}
                        {h.entry.stage !== undefined && h.entry.kind !== 'stage' ? <span className="search-hit-stage">{h.entry.stage}</span> : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
              {g.hits.length > PER_GROUP && !open.has(g.kind) ? (
                <button type="button" className="search-more" onClick={() => setOpen((o) => new Set([...o, g.kind]))}>
                  Show all {g.hits.length} {g.label.toLowerCase()}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
