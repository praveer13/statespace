// A Desk session (docs/AUDIT-DESK.md sections 5.2 to 5.5): the seed in the address draws the cases, the sound share
// and the order, so a reload or a second tab serves the same session. Cases come one at a time; feedback waits until the
// last finding, so earlier answers say nothing about later cases. Then the counts, split by truth (never a pooled
// "k of n"), and each case's answer key with its pair.

import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTitle } from '../../app/title.ts'
import { useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { CaseDesk, useFiledFocus } from './CaseDesk.tsx'
import { Feedback } from './Feedback.tsx'
import { composeAuditSitting } from './judgment.ts'
import { allCases, loadAudit } from './pool.ts'
import type { AuditAnchor, AuditCase, AuditPool } from './pool.ts'
import type { Finding, Graded } from './record.ts'
import { findingOf, grade, sittingFindings } from './record.ts'
import './audit.css'

type Served = { anchor: AuditAnchor; c: AuditCase }

function compose(pool: AuditPool, seed: number, n: number): Served[] | null {
  const cases = allCases(pool)
  const picks = composeAuditSitting({
    surface: 'desk',
    cases: cases.map(({ anchor, c }) => ({ id: c.ref, anchor: anchor.id, stage: anchor.stage, pair: c.pair, truth: c.key.truth })),
    size: n,
    seed,
  })
  return picks === null ? null : picks.map((i) => cases[i] as Served)
}

function Session({ pool, seed, n }: { pool: AuditPool; seed: number; n: number }) {
  const store = useStore()
  const ev = useEvents(store)
  const events = ev.status === 'ready' ? ev.events : []
  const served = useMemo(() => compose(pool, seed, n), [pool, seed, n])
  const sitting = String(seed)
  // Findings filed in this tab, for a browser that keeps no record; the log's findings win where both exist.
  const [local, setLocal] = useState<Map<string, { finding: Finding; graded: Graded }>>(new Map())
  const countsHead = useFiledFocus<HTMLHeadingElement>()
  if (served === null) {
    return (
      <p className="aplain">
        The pool cannot fill a session of {n} cases while keeping pairs apart and the sound share between 30 and 60 percent. <Link to="/audit">Start a
        smaller one</Link>.
      </p>
    )
  }
  if (store === undefined || ev.status === 'loading') {
    return (
      <p className="aplain" role="status">
        Opening your record…
      </p>
    )
  }
  const logged = sittingFindings(events, sitting)
  const filed = (s: Served): { finding: Finding; graded: Graded } | undefined => {
    const e = logged.get(s.c.ref)
    if (e !== undefined) {
      const finding = findingOf(e)
      return { finding, graded: grade(s.c, finding) }
    }
    return local.get(s.c.ref)
  }
  const current = served.findIndex((s) => filed(s) === undefined)

  if (current >= 0) {
    const s = served[current] as Served
    return (
      <>
        <p className="aprogress" role="status">
          Case {current + 1} of {n} · {current} filed
        </p>
        <CaseDesk
          key={s.c.ref}
          pool={pool}
          anchor={s.anchor}
          c={s.c}
          n={current + 1}
          sitting={{ id: sitting, position: current, size: n }}
          seed={seed}
          store={store}
          events={events}
          onFiled={(finding, graded) => {
            setLocal((m) => new Map(m).set(s.c.ref, { finding, graded }))
            window.scrollTo({ top: 0 })
          }}
        />
      </>
    )
  }

  const results = served.map((s) => ({ s, r: filed(s) as { finding: Finding; graded: Graded } }))
  const sound = results.filter((x) => x.r.graded.truth === 'sound')
  const flawed = results.filter((x) => x.r.graded.truth === 'flawed')
  return (
    <>
      <section className="audit-section" aria-labelledby="as-counts">
        <h2 id="as-counts" ref={countsHead} tabIndex={-1}>
          Your session
        </h2>
        <table className="atable">
          <caption>Counts, split by truth. A pooled score would rise with the share of flawed cases, so none is shown.</caption>
          <tbody>
            <tr>
              <th scope="row">Sound cases accepted</th>
              <td className="num">
                {sound.filter((x) => x.r.graded.ok).length} of {sound.length}
              </td>
            </tr>
            <tr>
              <th scope="row">Flawed cases found</th>
              <td className="num">
                {flawed.filter((x) => x.r.graded.found).length} of {flawed.length}
              </td>
            </tr>
            <tr>
              <th scope="row">… with an accepted kind and lines that carry it</th>
              <td className="num">
                {flawed.filter((x) => x.r.graded.ok).length} of {flawed.length}
              </td>
            </tr>
            <tr>
              <th scope="row">Calls that matched</th>
              <td className="num">
                {results.filter((x) => x.r.graded.callMatched).length} of {results.length}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="aplain">
          <Link to="/audit">Back to the Desk</Link>, where your audit accuracy counts these findings.
        </p>
      </section>
      {results.map(({ s, r }, i) => (
        <section key={s.c.ref} className="audit-section" aria-labelledby={`as-case-${i}`} style={{ ['--vol' as string]: `var(--vol-${s.anchor.stage.slice(1)})` }}>
          <h2 id={`as-case-${i}`}>
            Case {i + 1} · {s.anchor.subject}
          </h2>
          <Feedback pool={pool} anchor={s.anchor} c={s.c} n={i + 1} finding={r.finding} graded={r.graded} />
        </section>
      ))}
    </>
  )
}

export function SessionScreen() {
  useTitle('Audit session')
  const [params] = useSearchParams()
  const loaded = useLoaded(loadAudit, [])
  const seed = Number(params.get('seed'))
  const n = Number(params.get('n'))
  const valid = Number.isInteger(seed) && seed >= 0 && seed < 2 ** 32 && Number.isInteger(n) && n >= 1 && n <= 8
  return (
    <article className="screen audit">
      <header className="screen-head ws-head">
        <h1>Desk session</h1>
        <p className="lede">Judge each case on its own. The answers wait until your last finding.</p>
      </header>
      {!valid ? (
        <p className="aplain">
          This address names no session. <Link to="/audit">Start one at the Desk</Link>.
        </p>
      ) : loaded.status === 'loading' ? (
        <p className="aplain" role="status">
          Opening the cases…
        </p>
      ) : loaded.status === 'error' ? (
        <p className="aplain" role="status">
          The cases did not load ({loaded.message}). Reload the page to try again.
        </p>
      ) : (
        <Session pool={loaded.value} seed={seed} n={n} />
      )}
    </article>
  )
}
