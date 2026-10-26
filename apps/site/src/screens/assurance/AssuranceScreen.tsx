// SCR-assurance (/assurance): what this course claims about itself, stamped by the same rules as the learner's
// (docs/DESIGN.md SCR-assurance; spine section 8.9; OD-8). The course's claims follow README's "What makes it different",
// each with the stamp packages/stamps derives from its recorded result, the runs behind it, the gates that back it and
// its limit; a red night marks a claim "unverified since <date>". Beside them, the course's erosion log: each tool
// bump re-runs the runs, and a reviewed diff becomes an EROSION entry. Then the edition pins, what this cannot
// establish, the honor system, and what to expect.

import { Link } from 'react-router'
import { useTitle } from '../../app/title.ts'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import { Stamp } from '../../components/stamp/index.ts'
import { runTag, SEAMS } from '../report/data.ts'
import { COURSE, NIGHTLY, stampedClaims } from './model.ts'
import './assurance.css'

const Runs = ({ runs }: { readonly runs: readonly string[] }) =>
  runs.length === 0 ? null : (
    <span className="as-runs">
      {runs.map((r) => (
        <code key={r} className="as-run">
          {runTag(r)}
        </code>
      ))}
    </span>
  )

const KIND_WORDS = { erosion: 'EROSION', rerun: 'Re-run, no diff', simulated: 'Simulated bump' } as const

export function AssuranceScreen() {
  useTitle('Assurance')
  const claims = stampedClaims()
  const held = SEAMS.filter((s) => s.fate === 'held')
  return (
    <article className="screen assurance">
      <header className="screen-head as-head">
        <h1>What this course claims about itself</h1>
        <p className="as-lede">
          The course holds itself to the rules it teaches. Its graders print their bounds, its claims carry stamps derived from recorded runs, and when a
          tool bump or a red night undermines one, it says so here.
        </p>
        <p className="as-night">
          {NIGHTLY?.date !== undefined
            ? `Last nightly status: ${NIGHTLY.date}${(NIGHTLY.failed ?? []).length > 0 ? `, with ${(NIGHTLY.failed ?? []).length} failed ${(NIGHTLY.failed ?? []).length === 1 ? 'gate' : 'gates'}` : ', every gate green'}.`
            : 'No nightly status is published with this build yet, so every claim below stands on the run it names.'}
        </p>
      </header>

      <div className="as-columns">
        <section aria-labelledby="as-claims" className="as-claims">
          <h2 id="as-claims" className="as-h2">
            The course’s claims
          </h2>
          {COURSE.sections.map((sec) => {
            const mine = claims.filter((c) => c.claim.section === sec.id)
            if (mine.length === 0) return null
            return (
              <section key={sec.id} aria-labelledby={`as-sec-${sec.id}`} className="as-group">
                <h3 id={`as-sec-${sec.id}`} className="as-h3">
                  {sec.title}
                </h3>
                <ol className="as-list">
                  {mine.map(({ claim, stamp, none, unverifiedSince, redGates }) => (
                    <li key={claim.id} className="as-claim" id={claim.id} data-red={unverifiedSince !== undefined || undefined}>
                      <p className="as-claim-head">
                        <span className="as-id">{claim.id}</span>
                        {claim.seam !== undefined ? <span className="as-seam">held seam {claim.seam}</span> : null}
                      </p>
                      <p className="as-text">
                        <InlineMd text={claim.text} />
                      </p>
                      <div className="as-stamp">{stamp !== null ? <Stamp stamp={stamp} badge={false} /> : <span className="as-none">{none}</span>}</div>
                      {unverifiedSince !== undefined ? (
                        <p className="as-unverified">
                          Unverified since {unverifiedSince}: {redGates.join(', ')} failed that night. The stamp stands on the run named below until a green night.
                        </p>
                      ) : null}
                      <dl className="as-rows">
                        <div>
                          <dt>Evidence</dt>
                          <dd>{claim.runs.length > 0 ? <>recorded run <Runs runs={claim.runs} /></> : 'no run: the stamp says why'}</dd>
                        </div>
                        <div>
                          <dt>Backed by</dt>
                          <dd>{claim.gates.length > 0 ? claim.gates.join(', ') : 'no gate yet'}</dd>
                        </div>
                        <div>
                          <dt>Limit</dt>
                          <dd>
                            <InlineMd text={claim.limit} />
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ol>
              </section>
            )
          })}
        </section>

        <aside aria-labelledby="as-log" className="as-log">
          <h2 id="as-log" className="as-h2">
            The course’s erosion log
          </h2>
          <p className="as-small">Each tool bump re-runs the runs registry. A reviewed diff becomes an EROSION entry; a clean re-run is logged too.</p>
          <ol className="as-entries">
            {COURSE.erosionLog.map((e) => (
              <li key={e.id} className="as-entry" data-kind={e.kind}>
                {e.kind === 'erosion' ? (
                  <svg className="as-crack" viewBox="0 0 48 10" aria-hidden="true" focusable="false">
                    <polyline className="line-crack" points="0,2 6,8 12,2 18,8 24,2 30,8 36,2 42,8 48,2" />
                  </svg>
                ) : null}
                <p className="as-entry-head">
                  <span className="as-entry-kind">{KIND_WORDS[e.kind]}</span>
                  <span className="as-entry-date">{e.date}</span>
                </p>
                <p className="as-entry-bump">{e.bump}</p>
                <p className="as-entry-text">
                  <InlineMd text={e.text} /> <Runs runs={e.runs} />
                </p>
                {e.touches.length > 0 ? <p className="as-small">Touches {e.touches.join(', ')}.</p> : null}
              </li>
            ))}
          </ol>

          <h2 className="as-h2 as-h2-gap">Held seams</h2>
          <p className="as-small">Not every assumption breaks. Three are tested and expected to hold; they never crack, and a red night marks the claims above that rest on them.</p>
          <ul className="as-held">
            {held.map((s) => (
              <li key={s.id}>
                <span className="as-id">{s.id}</span> <InlineMd text={s.assumption} />. <span className="as-small">Held · tested by {s.testedBy}.</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section aria-labelledby="as-pins" className="as-block">
        <h2 id="as-pins" className="as-h2">
          Edition pins
        </h2>
        <dl className="as-pins">
          {COURSE.pins.map((p) => (
            <div key={p.tool}>
              <dt>{p.tool}</dt>
              <dd>
                <strong>{p.pin}</strong>, {p.detail} <Runs runs={p.runs} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="as-cannot" className="as-block">
        <h2 id="as-cannot" className="as-h2">
          What this cannot establish
        </h2>
        <ul className="as-bullets">
          {COURSE.cannot.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="as-honor" className="as-block">
        <h2 id="as-honor" className="as-h2">
          Provenance on the honor system
        </h2>
        <p className="as-prose">{COURSE.honor}</p>
      </section>

      <section aria-labelledby="as-expect" className="as-block">
        <h2 id="as-expect" className="as-h2">
          What to expect
        </h2>
        <p className="as-prose">{COURSE.expect}</p>
        <p className="as-prose">
          Your own claims, assumptions and erosions are in <Link to="/report">your report</Link>.
        </p>
      </section>
    </article>
  )
}
