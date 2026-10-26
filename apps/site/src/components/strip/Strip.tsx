// M-assurance-strip: three segments, proposition of the model · correspondence · requirement fit, one primary
// stamp each (spine section 5.2; DESIGN.md section 5.6). Supporting stamps, open defeaters and the assumptions a
// segment rests on show as a "+n" disclosure, each assumption linked to its record; on the segment's edge each
// assumption also draws as a dashed tick. Requirement fit is never PROVED, neither [P] nor a Lean result's "PROVED
// modulo k assumed lemmas": buildStrip refuses both, and this component refuses them again rather than draw them. A
// claim never collapses to one stamp, and an agent's claim never reaches a strip (I8). The strip's spoken reading is
// packages/stamps' stripSpokenName.

import { useId } from 'react'
import { SEGMENT_LABELS, STRIP_SEGMENTS, provedInRequirement, type Strip as StripData, type StripAssumption, type StripCell, type StripSegment } from '@statespace/stamps'
import { LaneBadge } from '../stamp/LaneBadge.tsx'
import { Stamp } from '../stamp/Stamp.tsx'
import '../../styles/tokens.css'
import './strip.css'

export interface StripProps {
  readonly strip: StripData
  /** Where an assumption's record lives, such as the claim card's anchor for SEAM-1; without it the assumption is listed as text. */
  readonly assumptionHref?: (assumption: StripAssumption, segment: StripSegment) => string | undefined
  /** An id for the strip's label, so a claim card can point at it; unique per strip when absent. */
  readonly id?: string
}

/** What a "+n" disclosure holds: supporting stamps, open defeaters, then the assumptions the segment rests on. */
const extraCount = (cell: StripCell): number => cell.supporting.length + cell.defeaters.length + cell.assumptions.length

const assumptionText = (a: StripAssumption): string => `Rests on ${a.seam ? `${a.seam}: ` : ''}${a.text}`

function Segment({ segment, cell, assumptionHref }: { readonly segment: StripSegment; readonly cell: StripCell; readonly assumptionHref?: StripProps['assumptionHref'] }) {
  const refused = segment === 'requirement' && provedInRequirement(cell)
  const extra = extraCount(cell)
  return (
    <div className="strip-cell" data-segment={segment}>
      {cell.assumptions.length > 0 ? (
        // the ticks draw what the disclosure below lists in words, with links to the assumption records
        <span className="strip-ticks" aria-hidden="true">
          {cell.assumptions.map((_, i) => (
            <span key={i} className="strip-tick line-assumed" />
          ))}
        </span>
      ) : null}
      <dt className="strip-label">{SEGMENT_LABELS[segment]}</dt>
      <dd className="strip-value">
        {refused ? (
          <span className="strip-note">Not shown: requirement fit is never PROVED, because a checker establishes the proposition, not that it is the requirement.</span>
        ) : cell.primary ? (
          <span className="strip-primary">
            <Stamp stamp={cell.primary} badge={false} />
            <LaneBadge lane={cell.primary.lane} />
          </span>
        ) : cell.modulo ? (
          <span className="strip-modulo">{cell.modulo}</span>
        ) : (
          <span className="strip-note">pending</span>
        )}
        {!refused && extra > 0 ? (
          <details className="strip-more">
            <summary>
              <span aria-hidden="true">+{extra}</span>
              <span className="visually-hidden">
                {extra} more under {SEGMENT_LABELS[segment].toLowerCase()}
              </span>
            </summary>
            <ul className="strip-more-list">
              {cell.supporting.map((s, i) => (
                <li key={`s${i}`}>
                  <Stamp stamp={s} />
                </li>
              ))}
              {cell.defeaters.map((d, i) => (
                <li key={`d${i}`} className="strip-defeater">
                  Open defeater: {d.text}
                </li>
              ))}
              {cell.assumptions.map((a, i) => {
                const href = assumptionHref?.(a, segment)
                return (
                  <li key={`a${i}`} className="strip-assumption">
                    {href ? <a href={href}>{assumptionText(a)}</a> : assumptionText(a)}
                  </li>
                )
              })}
            </ul>
          </details>
        ) : null}
      </dd>
    </div>
  )
}

export function Strip({ strip, assumptionHref, id }: StripProps) {
  const generated = useId()
  const labelId = id ?? `strip-${generated}`
  return (
    <div className="strip" role="group" aria-labelledby={labelId}>
      <p className="visually-hidden" id={labelId}>
        Claim {strip.claim}, {strip.title}.
      </p>
      <dl className="strip-segments">
        {STRIP_SEGMENTS.map((segment) => (
          <Segment key={segment} segment={segment} cell={strip.cells[segment]} assumptionHref={assumptionHref} />
        ))}
      </dl>
    </div>
  )
}
