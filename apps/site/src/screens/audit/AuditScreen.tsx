// SCR-audit: the Audit Desk (DESIGN.md SCR-audit; docs/AUDIT-DESK.md sections 5 and 6, in learner words: "case",
// "kind of gap", "sound", "audit accuracy"). Start a seeded session, read audit accuracy derived from the log, or open
// any case: lists name a case's subject and stage, never its gap (AUDIT-DESK 5.3, item 7). In the series black
// (--vol-10), since the Desk draws on every volume; each case carries its own stage's ink.

import { Link, useNavigate } from 'react-router'
import { useState } from 'react'
import { useTitle } from '../../app/title.ts'
import { useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { Accuracy } from './Accuracy.tsx'
import { maxSitting, soundRange } from './judgment.ts'
import { allCases, browseOrder, loadAudit, mediumName, stageInk } from './pool.ts'
import type { AuditPool } from './pool.ts'
import { auditEvents, countedDecisions } from './record.ts'
import './audit.css'

const KINDS = [
  {
    attacks: 'The claim',
    how: 'The statement holds, but of the wrong thing.',
    gaps: ['a statement too weak for what it is said to prove', 'a premise that can never hold', 'a property of the wrong kind', 'a different requirement, faithfully proved'],
  },
  {
    attacks: 'The evidence',
    how: 'The check did not show what it is said to show.',
    gaps: [
      'an encoding whose arithmetic differs from the code’s',
      'a bounded or inconclusive run reported as proof',
      'trust hidden inside or beneath the checker',
      'an assumption about the environment left unsaid',
      'a test presented as proof',
    ],
  },
  {
    attacks: 'The step between',
    how: 'True premises, and still the conclusion does not follow.',
    gaps: ['a checked model that is not the shipped code', 'a model step coarser than the code’s', 'an observer that sees less than the attacker', 'a counterexample to induction treated as a bug'],
  },
] as const

const SIZES = [5, 6, 8] as const

/** A fresh seed for a session, from the browser's entropy pool (the session itself is then fixed by it). */
function freshSeed(): number {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0] as number
  } catch {
    return (Date.now() * 2654435761) >>> 0
  }
}

function sizesFor(pool: AuditPool): number[] {
  const max = maxSitting(allCases(pool).map(({ anchor, c }) => ({ id: c.ref, anchor: anchor.id, stage: anchor.stage, pair: c.pair, truth: c.key.truth })))
  const fit = SIZES.filter((n) => n <= max)
  return fit.length > 0 ? fit : max > 0 ? [max] : []
}

function StartSession({ pool, open }: { pool: AuditPool; open: Array<{ seed: string; size: number; filed: number }> }) {
  const navigate = useNavigate()
  const sizes = sizesFor(pool)
  const [size, setSize] = useState<number>(sizes[0] ?? 0)
  if (sizes.length === 0) return <p className="aplain">The pool holds no cases yet.</p>
  const pairs = sizes[sizes.length - 1] as number
  const [lo, hi] = soundRange(size)
  return (
    <div className="astart">
      {open.length > 0 ? (
        <ul className="aopen">
          {open.map((s) => (
            <li key={s.seed}>
              <Link to={`/audit/session?seed=${s.seed}&n=${s.size}`}>Continue your session</Link>{' '}
              <span className="anote-inline">
                {s.filed} of {s.size} cases filed
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {sizes.length > 1 ? (
        <fieldset className="afield">
          <legend className="afield-legend">How many cases?</legend>
          <div className="ataps">
            {sizes.map((n) => (
              <label key={n} className="atap" data-picked={size === n || undefined}>
                <input type="radio" name="asize" checked={size === n} onChange={() => setSize(n)} />
                <span className="atap-word">{n} cases</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <p className="aplain">
        {lo === hi ? `${lo} of the ${size} cases will be sound` : `Between ${lo} and ${hi} of the ${size} cases will be sound`}, and the rest flawed; a seed
        decides which, and the order. In every session between 30 and 60 percent of the cases are sound, a share that says nothing about how often agents
        err. The key, and the other case of each pair, come after your last finding.
      </p>
      {(sizes[0] ?? 0) < SIZES[0] ? (
        <p className="anote">The pool holds {pairs} pairs so far, and a session never holds both cases of a pair, so a session is {pairs} cases for now.</p>
      ) : null}
      <div className="aact">
        <button type="button" className="button button-primary" onClick={() => void navigate(`/audit/session?seed=${freshSeed()}&n=${size}`)}>
          Start a session of {size} cases
        </button>
      </div>
    </div>
  )
}

export function AuditScreen() {
  useTitle('Audit')
  const loaded = useLoaded(loadAudit, [])
  const store = useStore()
  const ev = useEvents(store)
  const events = ev.status === 'ready' ? ev.events : []
  const decisions = countedDecisions(events)
  // Sessions begun and not finished: their filed count is below their size.
  const sittings = new Map<string, { seed: string; size: number; filed: number }>()
  for (const e of auditEvents(events)) {
    const d = (e.data ?? {}) as { sitting?: unknown; size?: unknown }
    if (typeof d.sitting !== 'string' || d.sitting === 'open' || typeof d.size !== 'number') continue
    const s = sittings.get(d.sitting) ?? { seed: d.sitting, size: d.size, filed: 0 }
    s.filed += 1
    sittings.set(d.sitting, s)
  }
  const open = [...sittings.values()].filter((s) => s.filed < s.size).slice(-1)

  return (
    <article className="screen audit">
      <header className="screen-head ws-head">
        <h1>The Audit Desk</h1>
        <p className="lede">Decide whether an agent’s claim about code is justified before you trust the code.</p>
        <p className="audit-purpose">
          Each case is a claim, the statement it rests on and the change behind it. You call the statement first, then read the change, say what it
          establishes, name the kind of gap if there is one, and point at the lines that carry it. Every answer comes from a recorded run of a checker.
        </p>
      </header>

      {loaded.status === 'loading' ? (
        <p className="aplain" role="status">
          Opening the cases…
        </p>
      ) : loaded.status === 'error' ? (
        <p className="aplain" role="status">
          The cases did not load ({loaded.message}). Reload the page to try again.
        </p>
      ) : (
        <>
          <section aria-labelledby="audit-start" className="audit-section">
            <h2 id="audit-start">Start a session</h2>
            <StartSession pool={loaded.value} open={open} />
          </section>

          <section aria-labelledby="audit-acc" className="audit-section">
            <h2 id="audit-acc">Your audit accuracy</h2>
            {ev.status === 'unavailable' ? (
              <p className="aplain">This browser keeps no record, so no figure can be derived. Cases still open and grade here.</p>
            ) : (
              <Accuracy pool={loaded.value} decisions={decisions} />
            )}
          </section>

          <section aria-labelledby="audit-cases" className="audit-section">
            <h2 id="audit-cases">Every case</h2>
            <p className="audit-intro">Any case opens at any time. A session serves a case after the lab that teaches its kind; opened here, it is graded the same way.</p>
            <ol className="acat">
              {loaded.value.anchors.map((a) => (
                <li key={a.id} className="acat-row" style={{ ['--vol' as string]: stageInk(a.stage) }}>
                  <p className="acat-id">
                    <span className="stage-chip" aria-hidden="true" />
                    <span className="acat-stage">{a.stage}</span> <code>{a.id}</code>
                  </p>
                  <div className="acat-main">
                    <p className="acat-subject">{a.subject}</p>
                    <p className="acat-meta">
                      {mediumName(a.medium)} · {a.cases.length} cases · served after {a.scheduledAfter.join(', ')}
                    </p>
                  </div>
                  <ul className="acat-cases" aria-label={`Cases of ${a.id}`}>
                    {browseOrder(a).map((c, i) => (
                      <li key={c.ref}>
                        <Link to={`/audit/case/${a.id}/${i + 1}`} aria-label={`${a.id}, case ${i + 1}`}>
                          {i + 1}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      <section aria-labelledby="audit-kinds" className="audit-section">
        <h2 id="audit-kinds">Kinds of gap</h2>
        <p className="audit-intro">A gap attacks one of three things: the claim, the evidence under it, or the step from the evidence to the claim. The Desk names thirteen kinds.</p>
        <div className="audit-kinds">
          {KINDS.map((k) => (
            <section key={k.attacks} className="audit-kind" aria-label={`Gaps that attack ${k.attacks.toLowerCase()}`}>
              <h3 className="audit-kind-head">{k.attacks}</h3>
              <p className="audit-kind-how">{k.how}</p>
              <ul className="audit-kind-list">
                {k.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section aria-labelledby="audit-rules" className="audit-section">
        <h2 id="audit-rules">How the Desk keeps you honest</h2>
        <dl className="audit-rules">
          <div>
            <dt>Sound cases</dt>
            <dd>Between 30 and 60 percent of a session’s cases are sound, so flagging everything scores no better than chance.</dd>
          </div>
          <div>
            <dt>Pairs</dt>
            <dd>Cases come in pairs that differ in one place, one sound and one flawed. The two never share a session; after you file, you see the other beside yours.</dd>
          </div>
          <div>
            <dt>Your call</dt>
            <dd>The first call on a case is final. It is a calibration point, never credit.</dd>
          </div>
          <div>
            <dt>Your figure</dt>
            <dd>Audit accuracy, private and kept on this device. It is a count until a figure has ten decisions, and a rate with its interval after that.</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Always open. Every case can be opened at any time, and audit accuracy unlocks nothing.</dd>
          </div>
        </dl>
      </section>
    </article>
  )
}
