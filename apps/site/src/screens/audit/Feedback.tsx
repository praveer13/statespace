// After filing (docs/AUDIT-DESK.md section 5.5): the call against the case, the key and its acceptable set, whether
// the anchored lines carry it, the step-3 answer key with the run lines that set it, the other member of the pair
// beside this one (comparison before the principle, M-twins), and the dated incident the case is based on. Read like
// the answer key at the back of a book.

import type { AuditAnchor, AuditCase, AuditPool } from './pool.ts'
import { mediumName } from './pool.ts'
import { CaseFigure } from './Figure.tsx'
import type { Finding, Graded } from './record.ts'

const className = (pool: AuditPool, id: string): string => pool.classes.find((g) => g.id === id)?.name ?? id

export function keyText(pool: AuditPool, c: AuditCase): string {
  const k = c.key
  if (k.truth === 'sound') return 'none: sound'
  const also = k.acceptableTop.filter((g) => g !== k.top)
  const sub = k.class !== k.top ? ` (${k.class})` : ''
  return `${k.top}${sub} ${className(pool, k.top)}${also.length > 0 ? `; also accepted: ${also.map((g) => `${g} ${className(pool, g)}`).join(', ')}` : ''}`
}

function verdict(g: Graded, f: Finding): string {
  if (g.truth === 'sound') return f.named === 'none' ? 'Sound, and you accepted it.' : `Sound. You filed ${f.named}, a gap the case does not have.`
  if (!g.found) return 'Flawed, and you accepted it as sound.'
  if (!g.classRight) return `Flawed. You found a gap, but ${f.named} is not a kind the key accepts.`
  if (!g.evidenceValid) return 'Flawed. You named an accepted kind, but none of your lines carries it.'
  return 'Flawed. You found it, named an accepted kind, and your lines carry it.'
}

export interface FeedbackProps {
  readonly pool: AuditPool
  readonly anchor: AuditAnchor
  readonly c: AuditCase
  readonly n: number
  readonly finding: Finding
  readonly graded: Graded
}

export function Feedback({ pool, anchor, c, n, finding, graded }: FeedbackProps) {
  const other = anchor.cases.find((x) => x.pair === c.pair && x.ref !== c.ref)
  return (
    <section className="afb" aria-label={`Answer key for case ${n}`}>
      <p className="afb-call">
        <strong>{graded.callMatched ? 'Your call matched.' : 'Your call missed.'}</strong> {verdict(graded, finding)}
      </p>
      <dl className="acolophon">
        <div>
          <dt>Key</dt>
          <dd>{keyText(pool, c)}</dd>
        </div>
        <div>
          <dt>Set by</dt>
          <dd>
            <code>{c.keyRun}</code> {c.keyLines.length > 0 ? <span className="afb-lines">{c.keyLines.map((l) => `“${l}”`).join(' · ')}</span> : null}
          </dd>
        </div>
        <div>
          <dt>Exercise 3</dt>
          <dd>
            {graded.restatementRight} of {graded.restatementOf} scenarios as the engine answers them
          </dd>
        </div>
        {finding.proves !== '' ? (
          <div>
            <dt>You wrote</dt>
            <dd>This proves: {finding.proves}</dd>
          </div>
        ) : null}
      </dl>
      <p className="afb-explain">{c.explain}</p>

      {c.key.truth === 'flawed' ? (
        <div className="afb-figs">
          {(['statement', 'diff', 'receipt'] as const).map((part, i) =>
            c[part].length === 0 ? null : (
              <CaseFigure
                key={part}
                n={`${n}.${i + 1}`}
                part={part}
                title={part === 'statement' ? `Statement · ${mediumName(c.medium)}` : part === 'diff' ? 'Change · the agent’s diff' : 'Receipt · recorded run'}
                lines={c[part]}
                marked={c.evidence.loadBearing}
                picked={finding.lines}
              />
            ),
          )}
        </div>
      ) : null}

      <table className="atable atable-scen">
        <caption>
          {anchor.scenarioQuestion} The answers come from <code>{c.restatement.run}</code>.
        </caption>
        <thead>
          <tr>
            <th scope="col">Scenario</th>
            <th scope="col">You</th>
            <th scope="col">Engine</th>
            <th scope="col">Why</th>
          </tr>
        </thead>
        <tbody>
          {c.restatement.scenarios.map((s, i) => (
            <tr key={s.id} data-miss={finding.scenarios[i] !== s.answer || undefined}>
              <th scope="row">
                <code>{s.text}</code>
              </th>
              <td>{finding.scenarios[i] === true ? 'yes' : 'no'}</td>
              <td>{s.answer ? 'yes' : 'no'}</td>
              <td>
                {s.why} <code className="afb-keyline">{s.keyLine}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {other !== undefined ? (
        <div className="atwins">
          <h4 className="atwins-head">The other case of the pair</h4>
          <p className="aplain">
            The same claim and the same kind of change, keyed <strong>{keyText(pool, other)}</strong>. Read the two statements side by side before the
            explanation.
          </p>
          <div className="atwins-grid">
            <CaseFigure n={`${n}.a`} part="statement" title="This case" lines={c.statement} />
            <CaseFigure n={`${n}.b`} part="statement" title="The other case" lines={other.statement} />
          </div>
          <p className="afb-explain">{other.explain}</p>
        </div>
      ) : null}

      <aside className="abased" aria-label="Based on">
        <p className="abased-head">Based on</p>
        <p className="abased-text">{anchor.basedOn.incident}</p>
        <p className="abased-meta">
          {anchor.basedOn.date} ({anchor.basedOn.dateMarks}) ·{' '}
          {anchor.basedOn.source.map((s, i) => (
            <span key={s}>
              {i > 0 ? ', ' : ''}
              {/^https?:/.test(s) ? (
                <a href={s} rel="noreferrer">
                  {s.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                <code>{s}</code>
              )}
            </span>
          ))}
        </p>
      </aside>
    </section>
  )
}
