// Where a stage's Defence stands: each part's latest attempt as c of n with its Wilson interval, the overall, the
// rule's other conditions in words, and sign-off, all derived at read time (packages/learner/signoff). "Signed off" is
// drawn in ink, never in a stamp's colour, and nothing waits on it. A passed Defence is a test over n unseen items,
// never a proof of competence (ASSESSMENT.md section 6.7).

import { GRAPH, kcById } from '@statespace/kc'
import type { DefenceView, Part, PartAttempt } from '@statespace/learner/signoff'
import { MIN_PART_ITEMS, OVERALL_FLOOR, PART_FLOOR, PARTS, RELEARN_SESSIONS, retakeFrom } from '@statespace/learner/signoff'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import { dayText, intervalText, today, two } from './useDefence.ts'

export const PART_NAME: Record<Part, string> = { A: 'Part A · probes', B: 'Part B · defend', C: 'Part C · audit' }

function partState(l: PartAttempt | null): string {
  if (l === null) return 'not started'
  if (!l.complete) {
    if (l.answered >= l.size && l.pending > 0) return `waiting for the run of ${l.pending}`
    return `${l.answered} of ${l.size} answered`
  }
  if (l.size < MIN_PART_ITEMS) return `fewer than ${MIN_PART_ITEMS} items, so it cannot count`
  return l.passed ? `at or above the ${Math.round(PART_FLOOR * 100)}% floor` : `below the ${Math.round(PART_FLOOR * 100)}% floor`
}

/** One sentence: where the Defence stands, and what comes next. Nothing locks either way. */
export function outcomeLine(v: DefenceView): string {
  if (v.signedOff) return `Signed off${v.signOffAt !== null ? ` on ${dayText(v.signOffAt.slice(0, 10))}` : ''}.`
  if (v.passed) return 'Defence passed. Sign-off follows once each of the stage’s skills has fresh answers that match the key in three spaced sessions.'
  const started = PARTS.some((p) => v.parts[p].latest !== null) || v.explainBack !== null
  if (!started) return 'Not taken yet. It is open now, untimed, and runs over at least two sittings.'
  if (v.failedParts.length > 0) {
    const t = today()
    const parts = v.failedParts.map((p) => {
      const from = retakeFrom(v, p)
      return from === null ? `Part ${p} is below its floor` : from <= t ? `Part ${p} can be retaken on fresh seeds now` : `Part ${p} can be retaken on fresh seeds from ${dayText(from)}`
    })
    return `${parts.join('; ')}. The other parts keep their scores, and everything stays open meanwhile.`
  }
  if (v.suggestRetake !== null) return `Every part clears its floor and the overall is below ${Math.round(OVERALL_FLOOR * 100)}%. Choose one part to retake; the lowest is Part ${v.suggestRetake}.`
  const missing: string[] = []
  for (const p of PARTS) if (!(v.parts[p].latest?.complete ?? false)) missing.push(`Part ${p}`)
  if (v.explainBack === null) missing.push('Part D')
  if (missing.length > 0) return `In progress: ${missing.join(', ')} to go.`
  if (v.sessions < 2) return 'Parts A to C fell in one session; the Defence needs two. Any part retaken on another day counts.'
  if (!v.soundCase) return 'Part C held no sound case, so it is drawn again.'
  return 'In progress.'
}

export function Standing({ view, compact = false }: { readonly view: DefenceView; readonly compact?: boolean }) {
  const relearned = view.kcs.filter((k) => k.relearned).length
  return (
    <div className="dfn-standing">
      <p className="dfn-outcome" role="status">
        {view.signedOff ? <span className="dfn-signed">Signed off</span> : null} {view.signedOff ? outcomeLine(view).replace(/^Signed off/, '') : outcomeLine(view)}
      </p>
      <table className="dfn-table">
        <caption className={compact ? 'visually-hidden' : undefined}>Each part’s latest attempt. An item scores when its answer matched and you had no help. The interval is Wilson’s at 95%, over items, for you alone.</caption>
        <thead>
          <tr>
            <th scope="col">Part</th>
            <th scope="col" className="num">
              Score
            </th>
            <th scope="col" className="num">
              Interval
            </th>
            <th scope="col">Where it stands</th>
          </tr>
        </thead>
        <tbody>
          {PARTS.map((p) => {
            const l = view.parts[p].latest
            return (
              <tr key={p}>
                <th scope="row">
                  {PART_NAME[p]}
                  {l !== null && l.attempt > 1 ? <span className="dfn-note-inline"> · attempt {l.attempt}</span> : null}
                </th>
                <td className="num">{l === null ? '—' : `${l.correct} of ${l.size}`}</td>
                <td className="num">{l?.rate != null ? intervalText(l.rate) : '—'}</td>
                <td>{partState(l)}</td>
              </tr>
            )
          })}
          <tr className="dfn-total">
            <th scope="row">Parts A to C</th>
            <td className="num">{view.overall === null ? '—' : `${view.overall.hits} of ${view.overall.n}`}</td>
            <td className="num">{view.overall === null ? '—' : intervalText(view.overall)}</td>
            <td>{view.overall === null ? `needs ${Math.round(OVERALL_FLOOR * 100)}%` : view.overall.rate >= OVERALL_FLOOR ? `${two(view.overall.rate)}, at or above ${Math.round(OVERALL_FLOOR * 100)}%` : `${two(view.overall.rate)}, below ${Math.round(OVERALL_FLOOR * 100)}%`}</td>
          </tr>
        </tbody>
      </table>
      <dl className="dfn-facts">
        <div>
          <dt>Sessions</dt>
          <dd>
            {view.sessions} of at least 2
          </dd>
        </div>
        <div>
          <dt>Sound case</dt>
          <dd>{view.parts.C.latest === null ? 'not drawn yet' : view.soundCase ? 'one or more in Part C' : 'none yet'}</dd>
        </div>
        <div>
          <dt>Explain-back</dt>
          <dd>{view.explainBack === null ? 'not yet; required, never credited' : 'kept; required, never credited'}</dd>
        </div>
        <div>
          <dt>Skills relearned</dt>
          <dd>
            {relearned} of {view.kcs.length}, each by fresh answers that match the key in {RELEARN_SESSIONS} spaced sessions
          </dd>
        </div>
        {view.passed && view.overall !== null ? (
          <div>
            <dt>What it is</dt>
            <dd>
              A test on {view.unseenItems} unseen items over {view.sessions} sessions, Wilson {intervalText(view.overall)}. It says how these items went, not that the skill is
              settled.
            </dd>
          </div>
        ) : null}
        {view.signedOff ? (
          <div>
            <dt>Settled</dt>
            <dd>
              {view.kcs.filter((k) => k.settled).length} of {view.kcs.length} skills, each by a fresh probe answered 30 days or more after sign-off
            </dd>
          </div>
        ) : null}
      </dl>
      {!compact && view.kcs.length > 0 ? (
        <details className="dfn-kcs">
          <summary>The stage’s skills, and their spaced sessions</summary>
          <ul>
            {view.kcs.map((k) => (
              <li key={k.kc}>
                <InlineMd text={kcById(GRAPH, k.kc)?.name ?? k.kc} />{' '}
                <span className="dfn-note-inline">
                  · {k.spacedDays.length} of {RELEARN_SESSIONS}
                  {k.spacedDays.length > 0 ? ` (${k.spacedDays.map(dayText).join(', ')})` : ''}
                  {k.settled ? ' · settled' : ''}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}
