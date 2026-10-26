// SCR-mirror: private calibration and VRK30 (DESIGN.md section 6.12 and SCR-mirror; ASSESSMENT.md section 5.6). The screen is
// the view of two derivations (deriveMirror, deriveVrk30) and holds no rule of its own: what counts, what a band is diagnosed
// on and how a figure is imputed all live in packages/learner. Bias leads, then the hit rate per band, each with its interval and
// its n; a band gets a sentence only past the minimum. Ink only: no stamp hue, no green for good or red for bad, no comparison with
// anyone. Words from the learner's own record are text nodes, never markup.

import { Link } from 'react-router'
import { EXCLUSIONS } from '@statespace/learner/mirror'
import type { BandView, BinView, MirrorView, Vrk30View } from '@statespace/learner/mirror'
import '../../styles/tokens.css'
import './mirror.css'
import { Inline } from '../../components/call-it/inline.tsx'
import { COPY } from './copy.ts'
import { Interval } from './Interval.tsx'

export interface MirrorScreenProps {
  readonly record: 'loading' | 'ready' | 'unavailable'
  readonly mirror: MirrorView | null
  readonly vrk: Vrk30View | null
  /** The idea in words for a KC, or undefined for one the graph does not hold. */
  readonly ideaName: (kc: string) => string | undefined
}

export function MirrorScreen({ record, mirror, vrk, ideaName }: MirrorScreenProps) {
  return (
    <div className="mirror">
      <header className="mr-head">
        <h1>{COPY.title}</h1>
        <p className="mr-lede">{COPY.lede}</p>
        <p className="mr-back">
          <Link to="/today">{COPY.backToToday}</Link>
        </p>
      </header>
      {record === 'loading' ? (
        <p className="mr-note" role="status">
          {COPY.loading}
        </p>
      ) : record === 'unavailable' || mirror === null || vrk === null ? (
        <p className="mr-note">{COPY.unavailable}</p>
      ) : (
        <div className="mr-columns">
          <div className="mr-column">
            <Calibration mirror={mirror} />
            <Counts mirror={mirror} />
          </div>
          <div className="mr-column">
            <Vrk30 vrk={vrk} ideaName={ideaName} />
            <HowToRead />
          </div>
        </div>
      )}
    </div>
  )
}

const hasCalls = (bins: readonly BinView[]): boolean => bins.some((b) => b.calls > 0)

function Calibration({ mirror }: { readonly mirror: MirrorView }) {
  const shown = mirror.own.filter((b) => b.bin === 'answer' || b.calls > 0)
  return (
    <section className="mr-section">
      <h2>{COPY.calibration}</h2>
      {mirror.ownCalls === 0 ? <p className="mr-note">{COPY.empty}</p> : null}
      {shown.map((bin) => (
        <Group key={bin.bin} id={`mr-own-${bin.bin}`} heading={COPY.bins[bin.bin]} bin={bin} diagnose />
      ))}
      {hasCalls(mirror.assisted) ? (
        <div className="mr-apart">
          <h3 id="mr-assisted">{COPY.assistedHeading}</h3>
          <p className="mr-note">{COPY.assistedLede}</p>
          {mirror.assisted
            .filter((b) => b.calls > 0)
            .map((bin) => (
              <Group key={bin.bin} id={`mr-assisted-${bin.bin}`} heading={COPY.bins[bin.bin]} bin={bin} diagnose={false} />
            ))}
        </div>
      ) : null}
    </section>
  )
}

function Group({ id, heading, bin, diagnose }: { readonly id: string; readonly heading: string; readonly bin: BinView; readonly diagnose: boolean }) {
  return (
    <div className="mr-group" role="group" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`}>{heading}</h3>
      {diagnose ? <Bias bin={bin} /> : null}
      <ul className="mr-bands">
        {bin.bands.map((b) => (
          <li key={b.band.conf} className="mr-band">
            <Band view={b} diagnose={diagnose} />
          </li>
        ))}
      </ul>
      {diagnose && bin.resolution !== null && bin.bands[0]?.rate && bin.bands[2]?.rate ? (
        <p className="mr-resolution">{COPY.resolution(bin.bands[2].rate.rate, bin.bands[0].rate.rate, bin.resolution)}</p>
      ) : null}
    </div>
  )
}

function Bias({ bin }: { readonly bin: BinView }) {
  if (bin.bias === null || bin.accuracy === null || bin.meanConfidence === null) {
    return (
      <div className="mr-bias">
        <p className="mr-note">{bin.calls === 0 ? COPY.noCalls : COPY.biasWaiting(bin.calls)}</p>
      </div>
    )
  }
  return (
    <div className="mr-bias">
      <p className="mr-bias-line">
        <span className="mr-label">{COPY.biasLabel}</span> <span className="mr-figure">{COPY.bias(bin.bias.value, bin.bias.low, bin.bias.high)}</span>
      </p>
      <p className="mr-note">{COPY.biasDetail(bin.meanConfidence, bin.accuracy.hits, bin.accuracy.n, bin.accuracy.low, bin.accuracy.high)}</p>
    </div>
  )
}

function Band({ view, diagnose }: { readonly view: BandView; readonly diagnose: boolean }) {
  const r = view.rate
  const conf = view.band.conf
  return (
    <>
      <h4 className="mr-band-head">{COPY.bandHead(conf)}</h4>
      {r === null ? (
        <p className="mr-note">{COPY.bandEmpty}</p>
      ) : (
        <>
          <p className="mr-counts">{COPY.counts(r.hits, r.n, r.rate, r.low, r.high)}</p>
          <Interval rate={r} lo={conf === 'guess' && view.chance !== null ? view.chance : view.band.lo} hi={view.band.hi} />
          <div className="mr-axis-labels" aria-hidden="true">
            <span>{COPY.axisLow}</span>
            <span>{COPY.axisHigh}</span>
          </div>
          {diagnose ? <p className="mr-sentence">{sentenceOf(view)}</p> : null}
        </>
      )}
    </>
  )
}

function sentenceOf(v: BandView): string {
  const r = v.rate
  if (r === null) return COPY.bandEmpty
  if (!v.enough) return COPY.tooFew(v.calls)
  if (v.diagnosis === 'below') return COPY.below(v.band.conf, r.hits, r.n, r.low, r.high)
  if (v.diagnosis === 'above') return COPY.above(v.band.conf, r.hits, r.n, r.low, r.high)
  return COPY.reaches
}

function Counts({ mirror }: { readonly mirror: MirrorView }) {
  const left = EXCLUSIONS.filter((x) => mirror.excluded[x] > 0)
  return (
    <section className="mr-section">
      <h2>{COPY.countsHeading}</h2>
      <p className="mr-note">{COPY.counted(mirror.ownCalls)}</p>
      {left.length > 0 ? (
        <>
          <p className="mr-note">{COPY.leftOut}</p>
          <ul className="mr-left">
            {left.map((x) => (
              <li key={x}>{COPY.excluded[x](mirror.excluded[x])}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}

function Vrk30({ vrk, ideaName }: { readonly vrk: Vrk30View; readonly ideaName: (kc: string) => string | undefined }) {
  return (
    <section className="mr-section">
      <h2>
        {COPY.vrkHeading} (VRK<sub>30</sub>)
      </h2>
      {vrk.count === 0 && vrk.qualifying === 0 ? <p className="mr-note">{COPY.vrkNothing}</p> : null}
      <dl className="mr-facts">
        <div>
          <dt>{COPY.vrkTermCount}</dt>
          <dd>
            <span className="mr-figure">{COPY.vrkCount(vrk.count)}</span> {COPY.vrkCountDetail}
          </dd>
        </div>
        <div>
          <dt>{COPY.vrkTermRate}</dt>
          <dd>{vrk.perMonth === null ? COPY.vrkRateWaiting : COPY.vrkRate(vrk.perMonth, vrk.activeMonths.length)}</dd>
        </div>
        {vrk.accuracy !== null ? (
          <div>
            <dt>{COPY.vrkTermAnswers}</dt>
            <dd>{COPY.vrkAccuracy(vrk.accuracy.hits, vrk.accuracy.n, vrk.accuracy.low, vrk.accuracy.high)}</dd>
          </div>
        ) : null}
      </dl>
      {vrk.kcs.length > 0 ? (
        <>
          <h3>{COPY.vrkIdeas}</h3>
          <ul className="mr-ideas">
            {vrk.kcs.map((k) => (
              <li key={k.kc}>
                <span className="mr-idea">
                  <Inline text={ideaName(k.kc) ?? COPY.unknownIdea} codeClass="mr-code" runClass="mr-code" />
                </span>
                {k.settled ? <span className="mr-tag"> {COPY.settledTag}</span> : null}
                <span className="mr-note mr-since">{COPY.vrkSince(k.firstLearning.slice(0, 10), k.at.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="mr-note">{COPY.settledNote}</p>
    </section>
  )
}

function HowToRead() {
  return (
    <section className="mr-section">
      <details className="mr-how">
        <summary>{COPY.howHeading}</summary>
        {COPY.how.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </details>
    </section>
  )
}
