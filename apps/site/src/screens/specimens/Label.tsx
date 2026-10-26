// The body of a specimen label (DESIGN.md section 6.5): the stamp the run earns and the recorded-run badge beside it; the
// witness on paper, in the code face, under a heavy vermilion left rule; Violates, Because, Minimal?, Class, Cured by,
// Found in and Status; a dated incident's date and source; and the compact provenance block that closes every specimen
// label (section 6.1). Everything here is drawn from a LabelView, which is generated from the runs (model/label.ts); the
// stamp is drawn by the stamp component and never written here (GATE-stamps).

import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { DerivationView, LaneBadge } from '../../components/stamp/index.ts'
import { COPY } from './copy.ts'
import type { Row } from './model/cabinet.ts'
import { rich } from './model/label.ts'
import type { BlockView, LabelView } from './model/label.ts'
import type { RunFacts } from './model/types.ts'
import { Rich, RunId } from './Rich.tsx'
import { statusText } from './statusText.ts'

const recordedDetail = (run: RunFacts, tool: string): string => `${run.id} · ${tool}${run.date === null ? '' : ` · ${run.date}`}`

function Evidence({ view, id }: { readonly view: BlockView; readonly id: string }) {
  const kicker = view.kind === 'witness' ? COPY.item.witness : view.kind === 'answer' ? COPY.item.answer : null
  return (
    <figure className={`sp-evidence sp-evidence-${view.kind}`} aria-labelledby={`${id}-caption`}>
      <figcaption id={`${id}-caption`} className="sp-evidence-head">
        {view.caption === null ? null : (
          <span className="sp-caption">
            <Rich parts={view.caption} />
          </span>
        )}
        {kicker === null ? null : <span className="sp-kicker">{kicker}</span>}
        <span className="sp-evidence-line">{view.heading}</span>
      </figcaption>
      {view.kind === 'witness' && view.rows.length > 0 ? (
        <ul className={`sp-witness line-violation${view.rows.length > 6 ? ' sp-witness-many' : ''}`} aria-label={COPY.item.witness}>
          {view.rows.map((r) => (
            <li key={r.name}>
              <code>
                {r.name} = {r.value}
              </code>
            </li>
          ))}
        </ul>
      ) : null}
      {view.kind === 'witness' && view.replay !== null ? (
        <details className="sp-replay">
          <summary>{COPY.item.replay}</summary>
          <p>
            <code>{view.replay}</code>
          </p>
        </details>
      ) : null}
    </figure>
  )
}

/** A public source: a link when its address is https (the schema says it is, and this checks it once more), else its title as text. */
function Source({ title, url }: { readonly title: string; readonly url: string }) {
  return /^https:\/\/[!-~]+$/.test(url) ? (
    <a href={url} rel="noopener noreferrer">
      {title}
    </a>
  ) : (
    <span>{title}</span>
  )
}

function Field({ name, children }: { readonly name: string; readonly children: ReactNode }) {
  return (
    <div className="sp-field">
      <dt>{name}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function LinesFromRuns({ label }: { readonly label: LabelView }) {
  const blocks = [label.main, ...label.also]
  return (
    <details className="sp-lines">
      <summary>{COPY.item.lines}</summary>
      {blocks.map((b, i) => (
        <div key={i} className="sp-lines-block">
          <p className="sp-lines-run">
            <RunId id={b.run} />
          </p>
          <pre className="sp-pre">{b.lines.join('\n')}</pre>
        </div>
      ))}
    </details>
  )
}

export function LabelBody({ row, today, id }: { readonly row: Row; readonly today: string; readonly id: string }) {
  const { label, state } = row
  const status = statusText(state, today)
  const stampDefeaters = label.derivation.kind === 'stamp' ? label.derivation.stamp.defeaters : []
  return (
    <div className="sp-label">
      <div className="sp-stamp-row">
        <DerivationView derivation={label.derivation} badge={false} />
        <LaneBadge lane="recorded-run" detail={recordedDetail(label.foundIn.run, label.foundIn.tool)} />
      </div>
      {stampDefeaters.length > 0 ? (
        <ul className="sp-defeaters">
          {stampDefeaters.map((d) => (
            <li key={d.text}>Open defeater: {d.text}</li>
          ))}
        </ul>
      ) : null}

      <Evidence view={label.main} id={`${id}-main`} />
      {label.also.length === 0 ? null : <p className="sp-also-head sp-kicker">{COPY.item.also}</p>}
      {label.also.map((b, i) => (
        <Evidence key={i} view={b} id={`${id}-also-${i}`} />
      ))}

      <dl className="sp-fields">
        <Field name={COPY.fields.violates}>
          <Rich parts={label.violates} />
        </Field>
        <Field name={COPY.fields.because}>
          <Rich parts={label.because} />
        </Field>
        <Field name={COPY.fields.minimal}>
          <span className="sp-line">
            <Rich parts={rich(label.minimal.text)} />
          </span>
          {label.minimal.basis === null ? null : <span className="sp-line sp-basis">{label.minimal.basis}</span>}
          {label.minimal.runs.length === 0 ? null : (
            <span className="sp-line">
              {label.minimal.runs.map((r, i) => (
                <Fragment key={r}>
                  {i === 0 ? '' : ', '}
                  <RunId id={r} />
                </Fragment>
              ))}
            </span>
          )}
        </Field>
        <Field name={COPY.fields.class}>
          <Rich parts={label.classText} />
        </Field>
        <Field name={COPY.fields.curedBy}>
          <Rich parts={label.curedBy.text} />
          {label.curedBy.claim === null ? null : (
            <span>
              {' '}
              (<Link to="/claims">{label.curedBy.claim}</Link>)
            </span>
          )}
          {label.curedBy.fixed === null ? null : (
            <span>
              {' '}
              <code className="sp-code">{label.curedBy.fixed}</code>
            </span>
          )}
        </Field>
        <Field name={COPY.fields.foundIn}>
          {label.foundIn.lesson === null ? null : (
            <>
              <Link to={`/lessons/${label.foundIn.lesson}`}>{label.foundIn.lesson}</Link>
              {' · '}
            </>
          )}
          {label.foundIn.labStage === null ? null : <span>{label.foundIn.labStage} · </span>}
          {label.foundIn.tool} · <RunId id={label.foundIn.run.id} />
        </Field>
        {label.otherRuns.length === 0 ? null : (
          <Field name={COPY.fields.otherRuns}>
            {label.otherRuns.map((r) => (
              <span key={r.id} className="sp-line">
                <RunId id={r.id} />
              </span>
            ))}
          </Field>
        )}
        <Field name={COPY.fields.status}>
          {status.lead} {status.rest}
          {status.ready ? (
            <>
              {' '}
              <Link to="/today">{COPY.status.readyLink}</Link>.
            </>
          ) : null}
        </Field>
        {label.incident === null ? null : (
          <Field name={COPY.item.incident}>
            {label.incident.date} · {COPY.item.source}: <Source title={label.incident.sourceTitle} url={label.incident.sourceUrl} />
            {label.incident.toyModel ? ` · ${COPY.item.toyModel}` : null}
          </Field>
        )}
        <Field name={COPY.item.ideas}>
          <ul className="sp-ideas">
            {label.kcs.map((k) => (
              <li key={k.id}>
                <Rich parts={rich(k.name)} />
              </li>
            ))}
          </ul>
        </Field>
      </dl>

      <LinesFromRuns label={label} />

      <dl className="sp-provenance">
        <div>
          <dt>{COPY.provenance.sheet}</dt>
          <dd>{label.provenance.sheet}</dd>
        </div>
        <div>
          <dt>{COPY.provenance.rev}</dt>
          <dd>{label.provenance.rev}</dd>
        </div>
        <div>
          <dt>{COPY.provenance.drawn}</dt>
          <dd>{label.provenance.drawn ?? COPY.provenance.none}</dd>
        </div>
        <div>
          <dt>{COPY.provenance.checkedBy}</dt>
          <dd>{label.provenance.checkedBy}</dd>
        </div>
      </dl>
    </div>
  )
}
