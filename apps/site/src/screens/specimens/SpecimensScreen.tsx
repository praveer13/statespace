// SCR-specimens: the specimen cabinet (DESIGN.md SCR-specimens; spine section 10.1). Counterexamples kept beside their
// fixes: a section for every stage (a stage with none yet keeps its heading and says so), the labels generated from
// their runs, each specimen's status and the re-find schedule, and filters. Phone first: at 360 and 320 px one column,
// each label opened by its heading; from 900 px a filter rail beside labels laid out open, two or three across.
//
// This component draws what it is given: the cabinet (the build's evidence), the learner's events and today's local date.
// SpecimensRoute reads the event log and the clock; a test or a harness passes its own.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import type { LedgerEvent } from '@statespace/ledger'
import { COPY } from './copy.ts'
import { Filters } from './Filters.tsx'
import { Item } from './Item.tsx'
import { NO_FILTERS, buildView } from './model/cabinet.ts'
import type { Filters as FilterState } from './model/cabinet.ts'
import type { ScheduledRefind } from './model/status.ts'
import type { Cabinet } from './model/types.ts'
import { useMedia } from './useMedia.ts'
import './specimens.css'

export interface SpecimensScreenProps {
  readonly cabinet: Cabinet
  readonly events: readonly LedgerEvent[]
  /** The learner's local date, YYYY-MM-DD. */
  readonly today: string
  /** Whether the practice record could be read: loading it, read, or not available in this browser. */
  readonly record: 'loading' | 'ready' | 'unavailable'
  /** Lay the screen out wide (every label open, beside a rail) or narrow, whatever the viewport; absent, the viewport decides. For tests and the harness. */
  readonly wide?: boolean
  /** The labels that start open below 900 px. */
  readonly initialOpen?: readonly string[]
  /** The filters the screen starts with; absent, none. For tests and the harness. */
  readonly initialFilters?: FilterState
}

const WIDE = '(min-width: 900px)'
/** The re-finds listed before the rest go behind a disclosure: a schedule, never a backlog (DESIGN.md section 6.11). */
const SCHEDULE_SHOWN = 5
const FRAGMENT = /^#(SP-[1-9][0-9]*\.[1-9][0-9]*)$/

export function SpecimensScreen({ cabinet, events, today, record, wide: forcedWide, initialOpen = [], initialFilters = NO_FILTERS }: SpecimensScreenProps) {
  const [filters, setFilters] = useState(initialFilters)
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(initialOpen))
  const viewport = useMedia(WIDE)
  const wide = forcedWide ?? viewport
  const view = useMemo(() => buildView(cabinet, events, today, filters), [cabinet, events, today, filters])
  const toggle = useCallback(
    (id: string) =>
      setOpen((prev) => {
        const next = new Set(prev)
        if (!next.delete(id)) next.add(id)
        return next
      }),
    [],
  )

  // A link to a specimen (/specimens#SP-1.1) opens its label and brings it into view. The fragment is read only as an ID
  // of the form SP-n.k, matched against the specimens listed, and never decoded or parsed (GATE-bundle's fragment lint).
  const scheduleItem = (s: ScheduledRefind) => {
    const title = view.titles.get(s.specimen)
    return (
      <li key={s.specimen}>
        {title === undefined ? (
          <span className="sp-id">{s.specimen}</span>
        ) : (
          <Link to={{ hash: `#${s.specimen}` }} className="sp-schedule-link">
            <span className="sp-id">{s.specimen}</span> {title}
          </Link>
        )}
        <span className="sp-schedule-date">
          {COPY.schedule.from(s.from)}
          {s.ready ? ` · ${COPY.schedule.ready}` : ''}
        </span>
      </li>
    )
  }
  const { hash } = useLocation()
  const target = FRAGMENT.exec(hash)?.[1] ?? null
  useEffect(() => {
    if (target === null || record !== 'ready' || !view.titles.has(target)) return
    if (!view.drawers.some((d) => d.rows.some((r) => r.entry.record.id === target))) {
      // the specimen is held but the filters hide it: show everything, and this runs again with it listed
      setFilters(NO_FILTERS)
      return
    }
    setOpen((prev) => (prev.has(target) ? prev : new Set(prev).add(target)))
    document.getElementById(target)?.scrollIntoView({ block: 'start' })
  }, [target, record, view])

  return (
    <div className="specimens">
      <header className="sp-head">
        <h1>{COPY.title}</h1>
        <p className="sp-lede">{COPY.lede}</p>
        {view.anyDraft ? <p className="sp-draft">{COPY.draft}</p> : null}
      </header>

      {record === 'loading' ? (
        <p className="sp-note" role="status">
          {COPY.loading}
        </p>
      ) : (
        <div className="sp-layout">
          <aside className="sp-rail" aria-label={COPY.rail}>
            <Filters view={view} filters={filters} onChange={setFilters} />
          </aside>
          <div className="sp-main">
            {record === 'unavailable' ? (
              <p className="sp-note" role="status">
                {COPY.unavailable}
              </p>
            ) : null}

            {view.held > 0 ? (
              <section className="sp-schedule" aria-labelledby="sp-schedule-heading">
                <h2 id="sp-schedule-heading">{COPY.schedule.heading}</h2>
                <p>{COPY.schedule.intro}</p>
                {view.schedule.length === 0 ? (
                  <p>{COPY.schedule.none}</p>
                ) : (
                  <>
                    <ul className="sp-schedule-list">{view.schedule.slice(0, SCHEDULE_SHOWN).map((s) => scheduleItem(s))}</ul>
                    {view.schedule.length > SCHEDULE_SHOWN ? (
                      <details className="sp-more">
                        <summary>{COPY.schedule.more(view.schedule.length - SCHEDULE_SHOWN)}</summary>
                        <ul className="sp-schedule-list">{view.schedule.slice(SCHEDULE_SHOWN).map((s) => scheduleItem(s))}</ul>
                      </details>
                    ) : null}
                  </>
                )}
              </section>
            ) : null}

            {record === 'ready' && view.empty === 'none-met' ? <p className="sp-note">{COPY.noneMet}</p> : null}
            {view.empty === 'no-match' ? (
              <p className="sp-note">
                {COPY.noMatch}{' '}
                <button type="button" className="sp-link-button" onClick={() => setFilters(NO_FILTERS)}>
                  {COPY.showAll}
                </button>
              </p>
            ) : null}

            {view.drawers.map((d) => (
              <section key={d.stage.id} className="sp-drawer" aria-labelledby={`sp-stage-${d.stage.id}`} data-empty={d.rows.length === 0 ? 'true' : 'false'}>
                <h2 id={`sp-stage-${d.stage.id}`} className="sp-stage-head">
                  <span className="sp-stage-id">{d.stage.id}</span> {d.stage.title}
                  {d.rows.length === 0 ? <span className="sp-none"> · {d.held === 0 ? COPY.noneYet : COPY.noneMatch}</span> : null}
                </h2>
                {d.rows.length === 0 ? null : (
                  <ul className="sp-list">
                    {d.rows.map((r) => (
                      <li key={r.entry.record.id}>
                        <Item row={r} today={today} open={open.has(r.entry.record.id)} wide={wide} onToggle={() => toggle(r.entry.record.id)} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
