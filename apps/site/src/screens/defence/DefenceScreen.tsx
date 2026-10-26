// SCR-defence (spine section 8.6; ASSESSMENT.md section 6; README "The Defence"): a stage's four-part Defence. Part A,
// probes on unseen seeds from at least three families, a call on each; Part B, predictions about seeded mutations of
// your own lab artifact, graded by the run you bring back; Part C, four audit cases with at least one sound; Part D,
// the explain-back, required and never credited. Untimed, over at least two sittings. Every score is derived from the
// record at read time; nothing locks, and a failed part is retaken on fresh seeds three days later.

import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import type { LabPage, StagePage } from '@statespace/content'
import type { LedgerEvent } from '@statespace/ledger'
import type { DefenceView, Part, PartAttempt } from '@statespace/learner/signoff'
import { defenceRef, defendOutcomes, retakeFrom, retakeOpen } from '@statespace/learner/signoff'
import { loadLabs, loadStages, useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { useTitle } from '../../app/title.ts'
import { Failed, Loading, Missing } from '../../components/page/states.tsx'
import { splitTitle, volumeOf } from '../../components/volume/volumes.ts'
import type { LedgerStore } from '../../storage/index.ts'
import { loadAudit } from '../audit/pool.ts'
import { PartB } from './PartB.tsx'
import { PartC } from './PartC.tsx'
import { PartD } from './PartD.tsx'
import { planOf } from './plan.ts'
import type { StagePlan } from './plan.ts'
import { Probe } from './Probe.tsx'
import { mutantsOf, planPartA, samplePartB, samplePartC } from './sample.ts'
import { PART_NAME, Standing } from './Standing.tsx'
import { dayText, today, useDefence } from './useDefence.ts'
import './defence.css'
import '../../components/generated/generated.css'
import '../../components/page/page.css'

type Retakes = Partial<Record<Part, number>>

/** The attempt a part is on: the latest while it is open, the next once the learner starts a retake. */
function attemptOf(l: PartAttempt | null, retakes: Retakes, part: Part): number {
  const base = l?.attempt ?? 1
  const asked = retakes[part]
  return asked !== undefined && asked > base ? asked : base
}

export function DefenceScreen() {
  const { stage: id = '' } = useParams()
  const stages = useLoaded(loadStages, [])
  const stage = stages.status === 'ready' ? stages.value.find((s) => s.id === id) : undefined
  useTitle(stage !== undefined ? `Defence · ${stage.id}` : `Defence · ${id}`)
  if (stages.status === 'loading') return <Loading what="the Defence" />
  if (stages.status === 'error') return <Failed message={stages.message} />
  const plan = planOf(id)
  if (stage === undefined || plan === undefined) return <Missing what="stage" id={id} />
  return <Defence stage={stage} plan={plan} />
}

function Defence({ stage, plan }: { readonly stage: StagePage; readonly plan: StagePlan }) {
  const store = useStore()
  const ev = useEvents(store)
  const events = ev.status === 'ready' ? ev.events : null
  const view = useDefence(stage.id, events)
  const labs = useLoaded(loadLabs, [])
  const [retakes, setRetakes] = useState<Retakes>({})
  const v = volumeOf(stage.id)
  const { name } = splitTitle(stage.title)
  const lab: LabPage | undefined = labs.status === 'ready' ? labs.value.find((l) => l.id === stage.lab?.id) : undefined

  return (
    <article className="screen dfn" style={{ '--vol': v?.ink ?? 'var(--vol-10)' } as CSSProperties}>
      <header className="screen-head ws-head dfn-head">
        <nav className="dfn-crumbs" aria-label="Breadcrumb">
          <Link to="/stages">Stages</Link>
          <span aria-hidden="true"> / </span>
          <Link to={`/stages/${stage.id}`}>
            <span className="dfn-chip" aria-hidden="true" />
            {stage.id} {name}
          </Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">Defence</span>
        </nav>
        <h1>The Defence</h1>
        <p className="lede">
          Four parts that sign {stage.id} off, untimed, over at least two sittings in the week after {stage.lab !== null ? stage.lab.id : 'the stage'}: Part A first, then B to D. Close your agent. Nothing locks while you take it, and every attempt stays in your record.
        </p>
      </header>

      {ev.status === 'unavailable' ? <p className="dfn-plain">This browser is not keeping a record, so nothing you answer here can be scored. Everything still opens.</p> : null}

      {view === null || events === null ? (
        <p className="dfn-plain" role="status">
          Reading your record…
        </p>
      ) : (
        <>
          <section className="dfn-section" aria-labelledby="dfn-where">
            <h2 id="dfn-where">Where it stands</h2>
            <Standing view={view} />
          </section>

          <PartSection part="A" view={view} retakes={retakes} setRetakes={setRetakes} lede={`${plan.aSize} probes on seeds you have not met, drawn from at least three families. Make a call on each before you submit.`}>
            {(attempt) => <PartAView plan={plan} attempt={attempt} store={store} events={events} />}
          </PartSection>

          <PartSection part="B" view={view} retakes={retakes} setRetakes={setRetakes} lede={`Predict what ${plan.bSize} seeded mutations do to your own ${stage.lab?.id ?? 'lab'} artifact, then run them. The checker grades the run; the prediction scores when it matches.`}>
            {(attempt) =>
              labs.status !== 'ready' ? (
                <p className="dfn-plain" role="status">
                  Opening the lab…
                </p>
              ) : (
                <PartB
                  stage={stage.id}
                  lab={stage.lab?.id ?? null}
                  checks={lab?.stages.flatMap((s) => s.checks.map((c) => c.id)) ?? []}
                  attempt={attempt}
                  mutants={samplePartB(mutantsOf(lab, plan), plan, attempt)}
                  latest={view.parts.B.latest}
                  outcomes={defendOutcomes(events)}
                  store={store}
                  events={events}
                />
              )
            }
          </PartSection>

          <PartSection part="C" view={view} retakes={retakes} setRetakes={setRetakes} lede="Four cases from this stage’s Audit Desk pool, one or two of them sound. Judge each at the Desk’s five steps.">
            {(attempt) => <PartCView stage={stage.id} attempt={attempt} store={store} events={events} />}
          </PartSection>

          <section className="dfn-section" aria-labelledby="dfn-part-D">
            <h2 id="dfn-part-D">Part D · explain back</h2>
            <p className="lede">Required for the Defence to pass, and never credited. Nobody grades it.</p>
            <PartD plan={plan} partA={view.parts.A.latest} store={store} event={view.explainBack} />
          </section>
        </>
      )}
    </article>
  )
}

function PartSection({ part, view, retakes, setRetakes, lede, children }: { readonly part: Part; readonly view: DefenceView; readonly retakes: Retakes; readonly setRetakes: (f: (r: Retakes) => Retakes) => void; readonly lede: string; readonly children: (attempt: number) => ReactNode }) {
  const l = view.parts[part].latest
  const attempt = attemptOf(l, retakes, part)
  const retaking = l !== null && attempt > l.attempt
  const from = retakeFrom(view, part)
  const open = retakeOpen(view, part, today())
  // a part finished in this visit stays open in place; one finished earlier is tucked into a review
  const [openedIncomplete] = useState(() => !(l?.complete ?? false))
  const finished = l !== null && l.complete && !retaking
  return (
    <section className="dfn-section" aria-labelledby={`dfn-part-${part}`}>
      <h2 id={`dfn-part-${part}`}>
        {PART_NAME[part]}
        {attempt > 1 ? <span className="dfn-note-inline"> · attempt {attempt}</span> : null}
      </h2>
      <p className="lede">{lede}</p>
      {finished ? (
        <div className="dfn-done">
          <p className="dfn-plain">
            Attempt {l.attempt}: {l.correct} of {l.size}.{' '}
            {l.passed ? 'This part clears its floor and is not retaken to raise a score.' : 'This part is below its floor.'}
            {from !== null && !open ? ` A retake on fresh seeds opens on ${dayText(from)}; until then the rest of the course stays open.` : ''}
          </p>
          {open ? (
            <p className="actions">
              <button type="button" className="button button-primary" onClick={() => setRetakes((r) => ({ ...r, [part]: l.attempt + 1 }))}>
                Retake Part {part} on fresh seeds
              </button>
            </p>
          ) : null}
        </div>
      ) : null}
      {/* the work keeps its place in the tree, so a part finished in this visit keeps its last feedback in view */}
      {finished && !openedIncomplete ? (
        <details className="dfn-review">
          <summary>Review attempt {l.attempt}</summary>
          {children(l.attempt)}
        </details>
      ) : (
        <div className="dfn-work">{children(attempt)}</div>
      )}
    </section>
  )
}

function PartAView({ plan, attempt, store, events }: { readonly plan: StagePlan; readonly attempt: number; readonly store: LedgerStore | null | undefined; readonly events: readonly LedgerEvent[] }) {
  const slots = useLoaded(() => planPartA(plan, attempt), [plan.stage, attempt])
  const [held, setHeld] = useState<number | null>(null)
  if (slots.status === 'loading') return <p className="dfn-plain" role="status">Choosing the probes…</p>
  if (slots.status === 'error') return <p className="dfn-plain">The probes could not be chosen: {slots.message}</p>
  const { slots: list, families } = slots.value
  const answered = new Map(events.filter((e) => e.kind === 'probe').map((e) => [e.ref, e] as const))
  // the probe just answered stays in view, with its feedback, until the learner moves on
  const current = list.find((s) => s.index === held) ?? list.find((s) => !answered.has(defenceRef(plan.stage, 'A', attempt, s.index)))
  return (
    <div className="dfn-parta">
      <p className="dfn-note">
        From {families.length} families: {families.join(', ')}.
        {families.length < 3 ? ' This build draws fewer than the three the Defence asks for, so this attempt is a rehearsal of the shape.' : ''}
      </p>
      <ol className="dfn-slots" aria-label="The probes">
        {list.map((s) => {
          const e = answered.get(defenceRef(plan.stage, 'A', attempt, s.index))
          return (
            <li key={s.index} data-state={e !== undefined ? 'done' : s === current ? 'open' : 'waiting'}>
              <span className="dfn-case-n">A.{s.index}</span>
              <span className="dfn-slot-what">
                {s.family.replace('GEN-', '')} {s.template}
                {s.spiral ? ' · return' : ''}
              </span>
              <span className="dfn-note-inline">{e === undefined ? (s === current ? 'open now' : '') : e.ok === true ? (e.provenance === 'own' ? 'matched' : 'matched, with help') : e.ok === false ? 'missed' : 'not graded'}</span>
            </li>
          )
        })}
      </ol>
      {current !== undefined ? <Probe key={`${attempt}-${current.index}`} stage={plan.stage} attempt={attempt} size={list.length} slot={current} store={store} events={events} onAnswering={() => setHeld(current.index)} onDone={() => setHeld(null)} /> : <p className="dfn-plain">Every probe of this attempt is answered.</p>}
    </div>
  )
}

function PartCView({ stage, attempt, store, events }: { readonly stage: string; readonly attempt: number; readonly store: LedgerStore | null | undefined; readonly events: readonly LedgerEvent[] }) {
  const pool = useLoaded(loadAudit, [])
  if (pool.status === 'loading') return <p className="dfn-plain" role="status">Opening the cases…</p>
  if (pool.status === 'error') return <p className="dfn-plain">The cases did not load ({pool.message}).</p>
  const prior = events.filter((e) => !(e.kind === 'audit' && e.ref.startsWith(`audit:${stage}/C/${attempt}/`)))
  const cases = samplePartC(pool.value, stage, attempt, prior)
  return <PartC stage={stage} attempt={attempt} pool={pool.value} cases={cases} store={store} events={events} />
}
