// One erosion event (M-erosion-forecast, M-seam-erosion; docs/DESIGN.md section 5.7). It opens with the forecast:
// restate the claim from memory (practice, never graded, kept only in this tab's draft), then call which segment cracks,
// with a confidence, on the Call It sheet. Only after the call is recorded does the crack draw: a vermilion zig-zag
// (.line-crack) across the segment that cracks, never silently across the proposition of the model, with the one-line
// reason, the specimen that cracked it, and the remedies spine section 5.4 offers. Nothing locks: an erosion that has
// not fired in the learner's record can still be read, and says so.

import { useId, useState } from 'react'
import { Link } from 'react-router'
import type { CrackSegment, ErosionState } from '@statespace/ledger'
import { CRACK_SEGMENTS, forecastRef } from '@statespace/ledger'
import { claimName, specimenName } from '../../app/content.ts'
import { CallItCell } from '../../components/call-it/index.ts'
import type { ChoiceItem } from '../../components/call-it/index.ts'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import type { LedgerStore } from '../../storage/index.ts'
import { forecastOptions, keyOption, runTag, seamOf, SEGMENT_WORDS, stageNumber, type Erosion } from './data.ts'

const plain = (md: string): string => md.replace(/`/g, '')

function itemOf(er: Erosion): ChoiceItem {
  const what = er.claim !== null ? `${er.claim}` : 'it'
  return {
    form: 'choice',
    identity: { ref: forecastRef(er.id) },
    prompt: `Which segment of ${what} does ${er.specimen} crack?`,
    options: forecastOptions(er).map(({ id, text, why }) => ({ id, text, why })),
    key: keyOption(er),
    extra: { erosion: er.id, seam: er.seam },
  }
}

/** A zig-zag across the top edge of a cracked cell. Decorative: the words beside it say the same. */
function Crack() {
  const points = Array.from({ length: 25 }, (_, i) => `${i * 10},${i % 2 === 0 ? 2 : 9}`).join(' ')
  return (
    <svg className="er-crack" viewBox="0 0 240 11" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <polyline className="line-crack" points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** The claim's three segments and the assumption record under them, the cracked one drawn with the crack. */
export function CrackFigure({ er, cracked }: { readonly er: Erosion; readonly cracked: boolean }) {
  const seam = seamOf(er.seam)
  const cells: CrackSegment[] = [...CRACK_SEGMENTS]
  return (
    <figure className="er-figure">
      <ol className="er-cells">
        {cells.map((seg) => {
          const hit = cracked && seg === er.segment
          return (
            <li key={seg} className="er-cell" data-seg={seg} data-cracked={hit || undefined}>
              {hit ? <Crack /> : null}
              <span className="er-cell-label">{SEGMENT_WORDS[seg]}</span>
              <span className="er-cell-value">
                {seg === 'assumption' ? (
                  <>
                    <span className="er-seam-id">{er.seam}</span> {seam !== undefined ? <InlineMd text={seam.assumption} /> : null}
                  </>
                ) : seg === 'proposition' ? (
                  'Unchanged: the checker’s result about the model stands.'
                ) : hit ? (
                  'Cracked.'
                ) : (
                  'Not touched by this erosion.'
                )}
              </span>
              {hit ? (
                <span className="visually-hidden">
                  Cracked by erosion {er.id}, specimen {er.specimen}.
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
      <figcaption className="er-caption">
        {cracked
          ? `The crack runs across ${SEGMENT_WORDS[er.segment].toLowerCase()}. The proposition of the model is never changed silently.`
          : 'The crack appears once your call is recorded.'}
      </figcaption>
    </figure>
  )
}

export interface ErosionEventProps {
  readonly er: Erosion
  readonly state: ErosionState | undefined
  readonly store: LedgerStore | null | undefined
  /** The heading level the event's title takes in its page. */
  readonly level?: 2 | 3
}

export function ErosionEvent({ er, state, store, level = 2 }: ErosionEventProps) {
  const [restated, setRestated] = useState('')
  const restateId = useId()
  const H = level === 2 ? 'h2' : 'h3'
  const cracked = state?.status === 'cracked'
  const claim = er.claim !== null ? claimName(er.claim) : undefined
  const specimen = specimenName(er.specimen)
  const vol = stageNumber(er.cashedIn ?? er.specimen)
  const forecast = state?.forecast
  return (
    <section className="er-event" data-vol={vol} aria-labelledby={`${er.id}-title`}>
      <header className="er-head">
        <p className="er-ids">
          <span className="er-vol" aria-hidden="true" />
          <span>{er.id}</span>
          <span className="er-sep">·</span>
          <span>{er.seam}</span>
          <span className="er-sep">·</span>
          <span>{er.specimen}</span>
        </p>
        <H id={`${er.id}-title`} className="er-title">
          {cracked ? 'This has cracked.' : 'Before the reveal'}
        </H>
        <p className="er-status">{statusLine(er, state)}</p>
      </header>

      <div className="er-forecast">
        <p className="er-prompt">
          {er.claim !== null ? (
            <>
              Restate <strong>{er.claim}</strong>
              {claim !== undefined ? (
                <>
                  {' '}
                  (<InlineMd text={claim} />)
                </>
              ) : null}{' '}
              from memory, then call which segment cracks.
            </>
          ) : (
            <>
              Restate <InlineMd text={er.restate ?? 'the assumption'} /> from memory, then call which segment cracks.
            </>
          )}
        </p>
        {state?.builders ? <p className="er-note">You met {er.specimen} before this seam was planted, so the claim arrives with the seam already cracked. Call which segment it hits.</p> : null}
        <div className="er-restate">
          <label htmlFor={restateId} className="er-label">
            Your restatement
          </label>
          <textarea
            id={restateId}
            className="er-textarea"
            rows={3}
            value={restated}
            onChange={(e) => setRestated(e.target.value)}
            placeholder={er.claim !== null ? `${er.claim} says that…` : 'The draft assumed that…'}
            disabled={cracked}
          />
          <p className="er-hint">Practice for recall: it is never graded and never leaves this page.</p>
        </div>
        <CallItCell store={store} item={itemOf(er)} revealed actionLabel="Record my call and show the crack" helpToggle />
      </div>

      {cracked ? (
        <div className="er-reveal">
          <CrackFigure er={er} cracked />
          <p className="er-crack-line">
            {er.claim !== null ? (
              <>
                {er.claim} still holds of the model; its {SEGMENT_WORDS[er.segment].toLowerCase()} does not: <InlineMd text={er.reason} />
              </>
            ) : (
              <>
                The draft’s rule still type-checks; its {SEGMENT_WORDS[er.segment].toLowerCase()} does not: <InlineMd text={er.reason} />
              </>
            )}
            {er.runs.length > 0 ? <span className="er-runs"> {er.runs.map((r) => runTag(r)).join(' ')}</span> : null}
          </p>
          {forecast !== undefined ? (
            <p className="er-call">
              {forecast.matched === true ? 'Your call matched.' : forecast.matched === false ? 'Your call missed.' : 'Your call is recorded.'}
              {forecast.segment !== undefined ? ` You called ${SEGMENT_WORDS[forecast.segment].toLowerCase()}.` : ''}
            </p>
          ) : null}
          <div className="er-specimen">
            <p className="er-specimen-head">The specimen that cracked it</p>
            <p className="er-specimen-name">
              <span className="er-seam-id">{er.specimen}</span> {specimen !== undefined ? <InlineMd text={specimen} /> : null}
            </p>
            <p className="er-specimen-where">
              {er.cashedIn !== null ? (
                <>
                  Found in <Link to={`/lessons/${er.cashedIn}`}>{er.cashedIn}</Link>.{' '}
                </>
              ) : (
                <>Found in your Clearinghouse week after {er.clearinghouseAfter}, a fresh re-find of its class on your own outbox. </>
              )}
              <Link to="/specimens">Open the specimen cabinet</Link>.
            </p>
          </div>
          <div className="er-remedy">
            <p className="er-specimen-head">Remedies</p>
            <ul className="er-remedies">
              {er.remedies.map((r) => (
                <li key={r}>
                  <InlineMd text={r} />
                </li>
              ))}
            </ul>
            {er.drawer !== undefined ? (
              <p className="er-specimen-where">
                Drawer <Link to={`/drawers/${er.drawer}`}>{er.drawer}</Link> goes deeper.
              </p>
            ) : null}
            <p className="er-hint">The claim keeps its stamp. Its erosion log keeps this event after a remedy re-mints the segment, and your report carries it.</p>
          </div>
        </div>
      ) : (
        <CrackFigure er={er} cracked={false} />
      )}
    </section>
  )
}

function statusLine(er: Erosion, state: ErosionState | undefined): string {
  const where = er.cashedIn !== null ? er.cashedIn : `a Clearinghouse week after ${er.clearinghouseAfter}`
  const seam = seamOf(er.seam)
  const planted = seam?.plantedIn.join(' and ') ?? ''
  if (state === undefined || state.status === 'dormant') {
    return `Not fired in your record yet: it fires once you have met both ${planted}, where ${er.seam} is planted, and ${where}. You can read it now.`
  }
  if (state.status === 'fired') return `Fired: your record holds both ${planted} and ${where}.`
  return `Cracked in your record. ${plain(er.seam)} is no longer open.`
}
