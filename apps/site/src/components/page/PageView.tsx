// A lesson or a drawer (DESIGN.md SCR-lesson and SCR-drawer): the compact title block, a rail of segment titles only,
// the segments with their blocks, what the page establishes after its exit questions, the drawers beside it, and the
// previous and next lessons. A drawer is the same page without calls.

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { DRAFT_BANNER, tierFormat } from '@statespace/content'
import type { Lesson, StagePage } from '@statespace/content'
import type { LedgerEvent } from '@statespace/ledger'
import type { LedgerStore } from '../../storage/index.ts'
import { InlineMd, Markdown, noteCount, RefsContext } from '../markdown/Markdown.tsx'
import type { Refs } from '../markdown/Markdown.tsx'
import { answers, callRef, progressOf } from '../../app/progress.ts'
import { claimName, specimenName } from '../../app/content.ts'
import { CardBlock, ClaimBlock, InstrumentBlock, ItemBlock, ProseBlock, SpecimenBlock, Waiting } from './blocks.tsx'
import type { BlockContext } from './blocks.tsx'
import './page.css'

export interface PagerLink {
  readonly id: string
  readonly title: string
}

export interface PageViewProps {
  readonly page: Lesson
  readonly kind: 'lesson' | 'drawer'
  readonly stage: StagePage | undefined
  /** The build date: the title block's "Drawn". */
  readonly builtAt: string
  readonly store: LedgerStore | null | undefined
  readonly events: readonly LedgerEvent[] | null
  /** Drawer titles by ID, for the page's drawer links. */
  readonly drawerTitles: ReadonlyMap<string, string>
  readonly prev?: PagerLink | undefined
  readonly next?: PagerLink | undefined
}

export function TitleBlock({ cells }: { readonly cells: ReadonlyArray<readonly [string, ReactNode]> }) {
  return (
    <dl className="titleblock">
      {cells.map(([label, value]) => (
        <div key={label} className="titleblock-cell">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Rail({ page }: { readonly page: Lesson }) {
  const rail = page.rail ?? page.segments.map((s) => ({ id: s.id, title: s.title }))
  if (rail.length === 0) return null
  const list = (
    <ol className="rail-list">
      {rail.map((r) => (
        <li key={r.id}>
          <a href={`#${r.id}`}>{r.title}</a>
        </li>
      ))}
    </ol>
  )
  return (
    <>
      <details className="rail-fold">
        <summary>Segments ({rail.length})</summary>
        <nav aria-label="Segments">{list}</nav>
      </details>
      <nav className="rail" aria-label="Segments">
        <p className="kicker">Segments</p>
        {list}
      </nav>
    </>
  )
}

export function Pager({ prev, next }: { readonly prev?: PagerLink | undefined; readonly next?: PagerLink | undefined }) {
  if (prev === undefined && next === undefined) return null
  return (
    <nav className="pager" aria-label="Previous and next lessons">
      {prev !== undefined ? (
        <Link to={`/lessons/${prev.id}`} className="pager-link" rel="prev">
          <span className="kicker">Previous · {prev.id}</span>
          <span className="pager-title">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next !== undefined ? (
        <Link to={`/lessons/${next.id}`} className="pager-link pager-next" rel="next">
          <span className="kicker">Next · {next.id}</span>
          <span className="pager-title">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  )
}

export function PageView({ page, kind, stage, builtAt, store, events, drawerTitles, prev, next }: PageViewProps) {
  const answered = useMemo(() => answers(events ?? []), [events])
  const ctx: BlockContext = { page, kind, store, events, answered }
  const refs: Refs = useMemo(
    () => ({ runs: page.runs ?? {}, facts: (page.facts ?? {}) as Refs['facts'], unresolved: page.unresolved ?? [] }),
    [page],
  )
  // Sidenotes are numbered across the page, so each prose block starts where the one before it stopped.
  const noteStarts = useMemo(() => {
    const starts = new Map<string, number>()
    let next = 1
    page.segments.forEach((s, si) =>
      s.blocks.forEach((b, bi) => {
        if (b.type !== 'prose') return
        starts.set(`${si}.${bi}`, next)
        next += noteCount(b.md)
      }),
    )
    return starts
  }, [page])
  const progress = progressOf(page, answered)
  const establishes = page.establishes ?? { claims: [], specimens: [] }
  const checked = page.checkedBy ?? []
  let itemNo = 0
  // A claim or a specimen names what the questions before it find, so its card waits until they are answered (DESIGN.md
  // section 6.15: what a lesson establishes appears only after its questions; A7-07).
  let allAbove = true
  const asked = (key: string): void => {
    if (!answered.has(key)) allAbove = false
  }
  const shown = progress.total === 0 || progress.finished

  return (
    <RefsContext.Provider value={refs}>
      <article className="screen page" data-kind={kind}>
        <header className="screen-head page-head">
          <p className="kicker">
            {stage !== undefined ? (
              <>
                <Link to={`/stages/${stage.id}`}>
                  {stage.id} · {stage.title}
                </Link>{' '}
                ▸{' '}
              </>
            ) : null}
            {page.id}
          </p>
          <h1>
            <InlineMd text={page.title} />
          </h1>
          <p className="meta">
            {kind === 'lesson' && page.tier !== undefined ? tierFormat(page.tier) : 'Drawer'}
            {page.minutes !== undefined && page.minutes > 0 ? ` · about ${page.minutes} min` : ''}
            {progress.total > 0 ? ` · ${progress.answered} of ${progress.total} questions answered` : ''}
          </p>
          {page.draft ? <p className="banner">{DRAFT_BANNER}</p> : null}
          {page.objective !== undefined ? <Markdown md={page.objective} className="page-objective" /> : null}
          <TitleBlock
            cells={[
              ['Sheet', <code key="s">{page.id}</code>],
              ['Rev', page.rev !== undefined ? <code key="r">{page.rev.slice(0, 12)}</code> : '—'],
              ['Drawn', builtAt],
              [
                'Checked by',
                checked.length > 0
                  ? checked.map((c, i) => (
                      <span key={c.run} className="checked">
                        {i > 0 ? '; ' : ''}
                        {c.engine} {c.version} (<code>{c.run}</code>)
                      </span>
                    ))
                  : '—',
              ],
            ]}
          />
        </header>

        {page.deferred !== undefined ? (
          <aside className="content-card" data-variant="deferred" aria-label="Deferred">
            <p className="kicker">Deferred</p>
            <p className="content-card-title">What it is</p>
            <Markdown md={page.deferred.topic} />
            <p className="content-card-title">Why the course defers it</p>
            <Markdown md={page.deferred.why} />
            <p className="content-card-title">What brings it up</p>
            <Markdown md={page.deferred.trigger} />
          </aside>
        ) : null}

        <div className="page-body">
          <Rail page={page} />
          <div className="page-main has-margin">
            {page.segments.map((s, si) => (
              <section key={s.id} id={s.id} className="segment" aria-labelledby={`${s.id}-title`}>
                <h2 id={`${s.id}-title`} className="segment-title">
                  {s.title}
                </h2>
                <p className="meta segment-meta">about {s.minutes} min</p>
                {s.blocks.map((b, bi) => {
                  switch (b.type) {
                    case 'prose':
                      return <ProseBlock key={bi} md={b.md} noteStart={noteStarts.get(`${si}.${bi}`) ?? 1} />
                    case 'instrument':
                      if (kind === 'lesson' && b.callOnFirstRun && b.call !== undefined) asked(callRef(page.id, b.cell))
                      return <InstrumentBlock key={bi} block={b} ctx={ctx} kc={s.kcs?.[0]} />
                    case 'item':
                      itemNo += 1
                      if (b.choice !== undefined) asked(`item:${page.id}/i${itemNo}`)
                      return <ItemBlock key={bi} block={b} n={itemNo} ctx={ctx} />
                    case 'claim':
                      return allAbove ? <ClaimBlock key={bi} template={b.template} /> : <Waiting key={bi} what="claim" />
                    case 'specimen':
                      return allAbove ? <SpecimenBlock key={bi} id={b.id} mount={b.mount} /> : <Waiting key={bi} what="specimen" />
                    case 'card':
                      return <CardBlock key={bi} block={b} />
                    default:
                      return null
                  }
                })}
              </section>
            ))}

            {establishes.claims.length + establishes.specimens.length > 0 && !shown ? (
              <section className="establishes" aria-labelledby="establishes-title">
                <h2 id="establishes-title">What this {kind} establishes</h2>
                <p className="lede">It appears here once you have answered the questions above.</p>
              </section>
            ) : null}
            {establishes.claims.length + establishes.specimens.length > 0 && shown ? (
              <section className="establishes" aria-labelledby="establishes-title">
                <h2 id="establishes-title">What this {kind} establishes</h2>
                <ul className="rows">
                  {establishes.claims.map((c) => (
                    <li key={c}>
                      <Link to="/claims" className="row">
                        <span className="row-id">{c}</span>
                        <span className="row-body">
                          <span className="row-title">{claimName(c) !== undefined ? <InlineMd text={claimName(c) as string} /> : c}</span>
                          <span className="row-meta">claim</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  {establishes.specimens.map((sp) => (
                    <li key={sp}>
                      <Link to="/specimens" className="row">
                        <span className="row-id">{sp}</span>
                        <span className="row-body">
                          <span className="row-title">{specimenName(sp) !== undefined ? <InlineMd text={specimenName(sp) as string} /> : sp}</span>
                          <span className="row-meta">specimen</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {(page.drawers ?? []).length > 0 ? (
              <section className="page-drawers" aria-labelledby="drawers-title">
                <h2 id="drawers-title">Drawers beside this {kind}</h2>
                <ul className="rows">
                  {(page.drawers ?? []).map((d) => (
                    <li key={d}>
                      <Link to={`/drawers/${d}`} className="row">
                        <span className="row-id">{d}</span>
                        <span className="row-body">
                          <span className="row-title">{drawerTitles.get(d) ?? d}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        {kind === 'drawer' && stage !== undefined ? (
          <p className="meta">
            <Link to={`/stages/${stage.id}`}>Back to {stage.id} · {stage.title}</Link>
          </p>
        ) : null}
        <Pager prev={prev} next={next} />
      </article>
    </RefsContext.Provider>
  )
}
