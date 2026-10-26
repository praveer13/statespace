// Audit accuracy (outcome (g)'s Judgment, docs/AUDIT-DESK.md sections 6.2 and 6.5), derived from the log at read time.
// Counts always; a rate only once its n reaches 10, and then with its interval: 95% Wilson for a proportion, and for
// balanced accuracy the mean of the two 97.5% Wilson intervals. Per-class figures appear only at n >= 10. Private and
// local: nothing here leaves the device.

import type { AuditPool } from './pool.ts'
import type { Decision } from './judgment.ts'
import { auditFigures, baInterval, CLASS_N, correct, found, wilson95 } from './judgment.ts'

const pct = (x: number): string => `${Math.round(x * 100)}%`
const span = ([l, u]: [number, number]): string => `${pct(l)}–${pct(u)}`

function Rate({ hits, n }: { hits: number; n: number }) {
  if (n < CLASS_N) return <span className="aacc-wait">{n} so far; a rate appears at {CLASS_N}</span>
  return (
    <span>
      {pct(hits / n)} <span className="aacc-int">({span(wilson95(hits, n))}, 95% interval)</span>
    </span>
  )
}

export function Accuracy({ pool, decisions }: { pool: AuditPool; decisions: readonly Decision[] }) {
  const flawed = decisions.filter((d) => d.truth === 'flawed')
  const sound = decisions.filter((d) => d.truth === 'sound')
  const tp = flawed.filter(found).length
  const tn = sound.filter((d) => d.pick === 'sound').length
  const right = flawed.filter(correct).length
  const figures = auditFigures(decisions)
  const ba = figures.find((f) => f.id === 'ba')
  const classes = pool.classes.map((g) => ({
    g,
    cases: flawed.filter((d) => d.primary === g.id),
    named: decisions.filter((d) => d.pick === 'gap' && d.named === g.id),
  }))
  const seenClasses = classes.filter((x) => x.cases.length > 0 || x.named.length > 0)

  if (decisions.length === 0) {
    return (
      <p className="aplain">
        No findings counted yet. Your figures appear here once you file: counts first, and a rate with its interval once a figure has ten
        decisions behind it.
      </p>
    )
  }
  return (
    <div className="aacc">
      <table className="atable">
        <caption>Counted findings: your own, on cases you had not seen. Kept on this device.</caption>
        <tbody>
          <tr>
            <th scope="row">Flawed cases found</th>
            <td className="num">
              {tp} of {flawed.length}
            </td>
            <td>
              <Rate hits={tp} n={flawed.length} />
            </td>
          </tr>
          <tr>
            <th scope="row">… with an accepted kind and lines that carry it</th>
            <td className="num">
              {right} of {flawed.length}
            </td>
            <td>
              <Rate hits={right} n={flawed.length} />
            </td>
          </tr>
          <tr>
            <th scope="row">Sound cases accepted</th>
            <td className="num">
              {tn} of {sound.length}
            </td>
            <td>
              <Rate hits={tn} n={sound.length} />
            </td>
          </tr>
          <tr>
            <th scope="row">Audit accuracy (balanced)</th>
            <td className="num">{decisions.length} findings</td>
            <td>
              {ba !== undefined && ba.value !== null && flawed.length >= CLASS_N && sound.length >= CLASS_N ? (
                <span>
                  {pct(ba.value)} <span className="aacc-int">({span(baInterval(tp, flawed.length, tn, sound.length))}, at least 95%)</span>
                </span>
              ) : (
                <span className="aacc-wait">a rate appears once flawed and sound cases each reach {CLASS_N}</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="anote">
        Balanced accuracy averages the two halves, so calling everything flawed, or everything sound, scores one half whatever the mix of cases.
      </p>
      {seenClasses.length > 0 ? (
        <table className="atable">
          <caption>By kind of gap. A rate appears once ten cases of a kind are counted (recall) or you have named it ten times (precision).</caption>
          <thead>
            <tr>
              <th scope="col">Kind</th>
              <th scope="col">Found right</th>
              <th scope="col">Named, and right</th>
            </tr>
          </thead>
          <tbody>
            {seenClasses.map(({ g, cases, named }) => (
              <tr key={g.id}>
                <th scope="row">
                  <code>{g.id}</code> {g.name}
                </th>
                <td>
                  {cases.filter(correct).length} of {cases.length} · <Rate hits={cases.filter(correct).length} n={cases.length} />
                </td>
                <td>
                  {named.filter(correct).length} of {named.length} · <Rate hits={named.filter(correct).length} n={named.length} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}
