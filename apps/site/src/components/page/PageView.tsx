// A lesson or a drawer (DESIGN.md SCR-lesson and SCR-drawer), set as a chapter inside its volume: a running head in the
// volume's ink, the chapter opener (number, title, objective, one colophon line, the draft banner and a ruled colophon),
// a rail of numbered segments, the segments with their blocks and any toys placed after them, what the page establishes
// after its exit questions, the drawers beside it, and the way on to the next lesson. A drawer is the same page without
// calls, printed as an appendix in the series black.

import { Suspense, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { DRAFT_BANNER, tierFormat } from '@statespace/content'
import type { Lesson, StagePage } from '@statespace/content'
import type { LedgerEvent } from '@statespace/ledger'
import type { LedgerStore } from '../../storage/index.ts'
import { InlineMd, Markdown, noteCount, RefsContext } from '../markdown/Markdown.tsx'
import type { Refs } from '../markdown/Markdown.tsx'
import { answers, callRef, progressOf } from '../../app/progress.ts'
import { claimName, specimenName } from '../../app/content.ts'
import { CoverArt } from '../volume/CoverArt.tsx'
import { splitTitle, volumeOf } from '../volume/volumes.ts'
import { lazyToy, toysFor } from '../toys/index.ts'
import type { ToyPlacement } from '../toys/index.ts'
import { CardBlock, ClaimBlock, InstrumentBlock, ItemBlock, ProseBlock, SpecimenBlock, Waiting } from './blocks.tsx'
import type { BlockContext } from './blocks.tsx'
import { AgentPanel } from '../agent/AgentPanel.tsx'
import '../volume/volume.css'
import './page.css'

export interface PagerLink {
  readonly id: string
  readonly title: string
}

export interface PageViewProps {
  readonly page: Lesson
  readonly kind: 'lesson' | 'drawer'
  readonly stage: StagePage | undefined
  /** The build date: the colophon's "Drawn". */
  readonly builtAt: string
  readonly store: LedgerStore | null | undefined
  readonly events: readonly LedgerEvent[] | null
  /** Drawer titles by ID, for the page's drawer links. */
  readonly drawerTitles: ReadonlyMap<string, string>
  readonly prev?: PagerLink | undefined
  readonly next?: PagerLink | undefined
}

/** The ink a chapter is printed in: its volume's, or the series black for a drawer or a page outside the ten volumes. */
export function chapterInk(kind: 'lesson' | 'drawer', stageId: string | undefined): CSSProperties {
  const v = kind === 'lesson' && stageId !== undefined ? volumeOf(stageId) : undefined
  return { '--vol': v?.ink ?? 'var(--vol-10)' } as CSSProperties
}

/** The chapter's number as the opener prints it: "Boot" for a stage's L0, "L3" for a lesson, the address for a drawer. */
export function chapterNumber(kind: 'lesson' | 'drawer', id: string): string {
  if (kind === 'drawer') return id
  const m = /\.L(\d+)$/.exec(id)
  if (m === null) return id
  return m[1] === '0' ? 'Boot' : `L${m[1]}`
}

/**
 * The running head: a full-bleed band in the volume's ink with the volume's number and name (a link back to the stage),
 * the page's address, and a small copy of the volume's cover figure. A drawer's head names it as an appendix.
 */
export function RunningHead({ kind, stage, id }: { readonly kind: 'lesson' | 'drawer'; readonly stage: StagePage | undefined; readonly id: string }) {
  const v = kind === 'lesson' && stage !== undefined ? volumeOf(stage.id) : undefined
  const name = stage !== undefined ? splitTitle(stage.title).name : undefined
  return (
    <div className="running-head">
      <div className="running-head-inner">
        {stage !== undefined ? (
          <Link to={`/stages/${stage.id}`} className="running-vol">
            {kind === 'drawer' ? (
              <>
                <span className="running-word">Drawer</span>
                <span className="running-name">
                  beside {stage.id} {name}
                </span>
              </>
            ) : (
              <>
                <span className="visually-hidden">Volume </span>
                <span className="running-n">{v?.n ?? stage.id}</span>
                <span className="running-name">{name}</span>
              </>
            )}
          </Link>
        ) : (
          <span className="running-vol">
            <span className="running-word">{kind === 'drawer' ? 'Drawer' : 'Lesson'}</span>
          </span>
        )}
        <code className="running-addr">{id}</code>
        {v !== undefined ? (
          <span className="running-art">
            <CoverArt kind={v.motif} id={`running-${id.replace(/[^A-Za-z0-9-]/g, '-')}`} />
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** The checked-by line: runs grouped under the engine and version that made them. */
function CheckedBy({ checked }: { readonly checked: ReadonlyArray<{ readonly run: string; readonly engine: string; readonly version: string }> }) {
  if (checked.length === 0) return <>—</>
  const groups = new Map<string, string[]>()
  for (const c of checked) {
    const k = `${c.engine} ${c.version}`
    groups.set(k, [...(groups.get(k) ?? []), c.run])
  }
  return (
    <ul className="colophon-checked">
      {[...groups].map(([engine, runs]) => (
        <li key={engine}>
          <span className="colophon-engine">{engine}</span>
          <span className="colophon-runs">
            {runs.map((r) => (
              <code key={r}>{r}</code>
            ))}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** The page's segments, numbered §1, §2 …; the one being read is marked by weight and a 3-px ink rule. */
function Rail({ page }: { readonly page: Lesson }) {
  const rail = useMemo(() => page.rail ?? page.segments.map((s) => ({ id: s.id, title: s.title })), [page])
  const [current, setCurrent] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const seen = new Set<string>()
    const watch = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target.id)
          else seen.delete(e.target.id)
        }
        const first = rail.find((r) => seen.has(r.id))
        if (first !== undefined) setCurrent(first.id)
      },
      { rootMargin: '-15% 0px -60% 0px' },
    )
    for (const r of rail) {
      const el = document.getElementById(r.id)
      if (el !== null) watch.observe(el)
    }
    return () => watch.disconnect()
  }, [rail])
  if (rail.length === 0) return null
  const list = (marked: boolean) => (
    <ol className="rail-list">
      {rail.map((r, i) => (
        <li key={r.id}>
          <a href={`#${r.id}`} aria-current={marked && current === r.id ? 'location' : undefined}>
            <span className="rail-n">§{i + 1}</span>
            <span className="rail-title">
              <InlineMd text={r.title} />
            </span>
          </a>
        </li>
      ))}
    </ol>
  )
  return (
    <>
      <details className="rail-fold">
        <summary>Segments ({rail.length})</summary>
        <nav aria-label="Segments">{list(false)}</nav>
      </details>
      <nav className="rail" aria-label="Segments">
        <p className="rail-head">Contents</p>
        {list(true)}
      </nav>
    </>
  )
}

/** The way on: the next lesson set large behind the series flag, the previous one small. */
export function Pager({ prev, next }: { readonly prev?: PagerLink | undefined; readonly next?: PagerLink | undefined }) {
  if (prev === undefined && next === undefined) return null
  return (
    <nav className="chapter-pager" aria-label="Previous and next lessons">
      {next !== undefined ? (
        <Link to={`/lessons/${next.id}`} className="chapter-next" rel="next">
          <span className="chapter-flag">
            <span className="chapter-flag-verb">Next</span>
            <span className="chapter-flag-id">{next.id}</span>
          </span>
          <span className="chapter-next-title">
            <InlineMd text={next.title} />
          </span>
        </Link>
      ) : null}
      {prev !== undefined ? (
        <Link to={`/lessons/${prev.id}`} className="chapter-prev" rel="prev">
          <span className="chapter-prev-label">Previous, {prev.id}:</span> <InlineMd text={prev.title} />
        </Link>
      ) : null}
    </nav>
  )
}

/** A toy placed after a segment, loaded when the lesson opens. */
function PlacedToy({ placement }: { readonly placement: ToyPlacement }) {
  const Toy = lazyToy(placement)
  return (
    <Suspense
      fallback={
        <p className="status toy-loading" role="status">
          Loading the figure “{placement.title}”…
        </p>
      }
    >
      <Toy />
    </Suspense>
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
  const toys = useMemo(() => (kind === 'lesson' ? toysFor(page.id) : []), [kind, page.id])
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
  const format = kind === 'lesson' && page.tier !== undefined ? tierFormat(page.tier) : 'Drawer'
  const colophonLine: ReactNode[] = [format]
  if (page.minutes !== undefined && page.minutes > 0) colophonLine.push(`about ${page.minutes} min`)
  if (progress.total > 0) colophonLine.push(`${progress.answered} of ${progress.total} questions answered`)

  return (
    <RefsContext.Provider value={refs}>
      <article className="chapter" data-kind={kind} style={chapterInk(kind, stage?.id)}>
        <header className="chapter-head">
          <RunningHead kind={kind} stage={stage} id={page.id} />
          <div className="chapter-open">
            <div className="chapter-title">
              <span className="chapter-n" aria-hidden="true">
                {chapterNumber(kind, page.id)}
              </span>
              <h1>
                <InlineMd text={page.title} />
              </h1>
            </div>
            {page.objective !== undefined ? <Markdown md={page.objective} className="chapter-lede" /> : null}
            <p className="chapter-line">{colophonLine.join(' · ')}</p>
            {page.draft ? <p className="banner chapter-banner">{DRAFT_BANNER}</p> : null}
            <dl className="chapter-colophon">
              <div>
                <dt>Address</dt>
                <dd>
                  <code>{page.id}</code>
                </dd>
              </div>
              <div>
                <dt>Revision</dt>
                <dd>{page.rev !== undefined ? <code>{page.rev.slice(0, 12)}</code> : '—'}</dd>
              </div>
              <div>
                <dt>Drawn</dt>
                <dd>{builtAt}</dd>
              </div>
              <div>
                <dt>Checked by</dt>
                <dd>
                  <CheckedBy checked={checked} />
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="page-body">
          <Rail page={page} />
          <div className="page-main has-margin">
            {page.deferred !== undefined ? (
              <aside className="content-card chapter-deferred" data-variant="deferred" aria-label="Deferred">
                <p className="content-card-title">Deferred</p>
                <p className="content-card-sub">What it is</p>
                <Markdown md={page.deferred.topic} />
                <p className="content-card-sub">Why the course defers it</p>
                <Markdown md={page.deferred.why} />
                <p className="content-card-sub">What brings it up</p>
                <Markdown md={page.deferred.trigger} />
              </aside>
            ) : null}
            {page.segments.map((s, si) => {
              let exercise = 0
              let figure = 0
              return (
                <section key={s.id} id={s.id} className="segment" aria-labelledby={`${s.id}-title`}>
                  <header className="segment-head">
                    <h2 id={`${s.id}-title`} className="segment-title">
                      <span className="segment-n">§{si + 1}</span> <InlineMd text={s.title} />
                    </h2>
                    <p className="segment-meta">about {s.minutes} min</p>
                  </header>
                  {s.blocks.map((b, bi) => {
                    switch (b.type) {
                      case 'prose':
                        return <ProseBlock key={bi} md={b.md} noteStart={noteStarts.get(`${si}.${bi}`) ?? 1} />
                      case 'instrument':
                        figure += 1
                        if (kind === 'lesson' && b.callOnFirstRun && b.call !== undefined) asked(callRef(page.id, b.cell))
                        return <InstrumentBlock key={bi} block={b} ctx={ctx} kc={s.kcs?.[0]} figure={`${si + 1}.${figure}`} />
                      case 'item':
                        itemNo += 1
                        exercise += 1
                        if (b.choice !== undefined) asked(`item:${page.id}/i${itemNo}`)
                        return <ItemBlock key={bi} block={b} n={itemNo} ctx={ctx} exercise={`${si + 1}.${exercise}`} />
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
                  {toys
                    .filter((t) => t.afterSegment === si + 1)
                    .map((t) => (
                      <PlacedToy key={t.title} placement={t} />
                    ))}
                </section>
              )
            })}

            {establishes.claims.length + establishes.specimens.length > 0 ? (
              <section className="chapter-end establishes" aria-labelledby="establishes-title">
                <h2 id="establishes-title">What this {kind} establishes</h2>
                {shown ? (
                  <ul className="end-rows">
                    {establishes.claims.map((c) => (
                      <li key={c}>
                        <Link to="/claims" className="end-row">
                          <code className="end-id">{c}</code>
                          <span className="end-title">{claimName(c) !== undefined ? <InlineMd text={claimName(c) as string} /> : c}</span>
                          <span className="end-meta">claim</span>
                        </Link>
                      </li>
                    ))}
                    {establishes.specimens.map((sp) => (
                      <li key={sp}>
                        <Link to="/specimens" className="end-row">
                          <code className="end-id">{sp}</code>
                          <span className="end-title">{specimenName(sp) !== undefined ? <InlineMd text={specimenName(sp) as string} /> : sp}</span>
                          <span className="end-meta">specimen</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="end-wait">It appears here once you have answered the questions above.</p>
                )}
              </section>
            ) : null}

            {(page.drawers ?? []).length > 0 ? (
              <section className="chapter-end page-drawers" aria-labelledby="drawers-title">
                <h2 id="drawers-title">Drawers beside this {kind}</h2>
                <ul className="end-rows">
                  {(page.drawers ?? []).map((d) => (
                    <li key={d}>
                      <Link to={`/drawers/${d}`} className="end-row">
                        <code className="end-id">{d}</code>
                        <span className="end-title">
                          <InlineMd text={drawerTitles.get(d) ?? d} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {kind === 'drawer' && stage !== undefined ? (
              <p className="chapter-back">
                <Link to={`/stages/${stage.id}`}>Back to {stage.id} · {stage.title}</Link>
              </p>
            ) : null}
            <AgentPanel id={page.id} title={page.title} kind={kind} />
            <Pager prev={prev} next={next} />
          </div>
        </div>
      </article>
    </RefsContext.Provider>
  )
}
