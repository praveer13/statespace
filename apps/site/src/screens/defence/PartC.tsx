// Part C, audit (ASSESSMENT.md sections 6.1 to 6.3): four cases from the stage's Audit Desk pool, one or two of them
// sound, each judged at the Desk's own five steps (screens/audit/CaseDesk.tsx). A filing is written as
// audit:S{n}/C/{attempt}/{index}, with the case it judged in `data.case`, and scores when a flawed case is found with an
// accepted kind and lines that carry it, or a sound case is accepted with its restatement answered.

import { useState } from 'react'
import type { EventInput, LedgerEvent } from '@statespace/ledger'
import { defenceRef, parseDefenceRef } from '@statespace/learner/signoff'
import type { LedgerStore } from '../../storage/index.ts'
import { CaseDesk } from '../audit/CaseDesk.tsx'
import { Feedback } from '../audit/Feedback.tsx'
import type { AuditPool } from '../audit/pool.ts'
import { findingOf, grade } from '../audit/record.ts'
import type { Finding, Graded } from '../audit/record.ts'
import type { DrawnCase } from './sample.ts'
import { caseSeen, hash32 } from './sample.ts'
import '../audit/audit.css'

export interface PartCProps {
  readonly stage: string
  readonly attempt: number
  readonly pool: AuditPool
  readonly cases: readonly DrawnCase[]
  readonly store: LedgerStore | null | undefined
  readonly events: readonly LedgerEvent[]
}

/** A store whose record() writes a Desk filing as this Defence position. Every other call goes to the store itself. */
function defenceStore(store: LedgerStore, stage: string, attempt: number, index: number, d: DrawnCase, prior: readonly LedgerEvent[]): LedgerStore {
  const seen = caseSeen(prior, d.c.ref)
  return new Proxy(store, {
    get(target, prop, receiver) {
      if (prop === 'record') {
        return (input: EventInput) =>
          target.record({
            ...input,
            ref: defenceRef(stage, 'C', attempt, index),
            exposure: seen ? 'seen' : 'unseen',
            data: { ...(input.data ?? {}), surface: 'defence', case: d.c.ref, stage, part: 'C', attempt, index, size: 4 },
          })
      }
      const v = Reflect.get(target, prop, receiver) as unknown
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v
    },
  })
}

export function PartC({ stage, attempt, pool, cases, store, events }: PartCProps) {
  const [local, setLocal] = useState<Map<number, { finding: Finding; graded: Graded }>>(new Map())
  // the record before this attempt: whether a case was met is judged against it, so a filing here never reshuffles the draw
  const prior = events.filter((e) => {
    const r = parseDefenceRef(e)
    return !(r !== undefined && r.stage === stage && r.part === 'C' && r.attempt === attempt)
  })
  const filedAt = (i: number): { finding: Finding; graded: Graded } | undefined => {
    const e = events.find((x) => x.kind === 'audit' && x.ref === defenceRef(stage, 'C', attempt, i))
    const d = cases[i - 1]
    if (e !== undefined && d !== undefined) {
      const finding = findingOf(e)
      return { finding, graded: grade(d.c, finding) }
    }
    return local.get(i)
  }
  if (cases.length === 0) return <p className="dfn-plain">The pool holds no cases for this stage yet.</p>
  const current = cases.findIndex((_, i) => filedAt(i + 1) === undefined)

  return (
    <div className="dfn-partc audit">
      <ol className="dfn-cases" aria-label="The four cases">
        {cases.map((d, i) => {
          const f = filedAt(i + 1)
          return (
            <li key={d.c.ref} className="dfn-case-row" data-state={f !== undefined ? 'filed' : i === current ? 'open' : 'waiting'}>
              <span className="dfn-case-n">C.{i + 1}</span> <span>{d.anchor.subject}</span>{' '}
              <span className="dfn-note-inline">{f !== undefined ? (f.graded.ok ? '· filed, your finding matched the key' : '· filed, your finding missed the key') : i === current ? '· open now' : '· after the one before'}</span>
            </li>
          )
        })}
      </ol>
      {current >= 0 && store !== undefined ? (
        <CaseDesk
          key={`${attempt}-${(cases[current] as DrawnCase).c.ref}`}
          pool={pool}
          anchor={(cases[current] as DrawnCase).anchor}
          c={(cases[current] as DrawnCase).c}
          n={current + 1}
          sitting={{ id: `defence-${stage}-C-${attempt}`, position: current, size: cases.length }}
          seed={hash32(`${stage}/C/${attempt}`)}
          store={store === null ? null : defenceStore(store, stage, attempt, current + 1, cases[current] as DrawnCase, prior)}
          events={events}
          onFiled={(finding, graded) => setLocal((m) => new Map(m).set(current + 1, { finding, graded }))}
        />
      ) : null}
      {current < 0
        ? cases.map((d, i) => {
            const f = filedAt(i + 1) as { finding: Finding; graded: Graded }
            return (
              <section key={d.c.ref} className="audit-section" aria-labelledby={`dfn-c-${i}`} style={{ ['--vol' as string]: `var(--vol-${d.anchor.stage.slice(1)})` }}>
                <h4 id={`dfn-c-${i}`} className="dfn-h4">
                  Case C.{i + 1} · {d.anchor.subject}
                </h4>
                <Feedback pool={pool} anchor={d.anchor} c={d.c} n={i + 1} finding={f.finding} graded={f.graded} />
              </section>
            )
          })
        : null}
    </div>
  )
}
