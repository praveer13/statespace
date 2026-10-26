// A stamp: `WORD [code] · qualifier`, the qualifier as large as the word, in a frame whose shape alone tells the
// nine stamps apart (DESIGN.md sections 5.2 and 5.3). The component renders a stamp that packages/stamps derived;
// it never builds one from text (I2; GATE-stamps). The visible bracketed code is hidden from assistive technology
// and spelled in the accessible name instead: "Proved, code P: Lean 4.35.0 kernel, axioms listed" (section 5.9).

import { Fragment } from 'react'
import { specOf, spokenName, type Stamp as StampData } from '@statespace/stamps'
import { LaneBadge } from './LaneBadge.tsx'
import '../../styles/tokens.css'
import './stamp.css'

export interface StampProps {
  readonly stamp: StampData
  /** Show the lane badge after the stamp (DESIGN.md section 5.5). A strip shows it per segment instead. */
  readonly badge?: boolean
  /**
   * Make the stamp a button that opens its details (a claim card's method row, a receipt). The target, padding
   * included, is at least 44 × 44 px (DESIGN.md section 5.3).
   */
  readonly onOpen?: () => void
  /** For a button: whether the details it controls are open, and their element's id. */
  readonly expanded?: boolean
  readonly controls?: string
  /**
   * The stamp has just arrived as a result (a run finished, a receipt was imported): it lands with the one motion a
   * stamp has. A stamp shown with a page that loads is idle and does not move (DESIGN.md sections 9.2 and 9.3).
   */
  readonly landing?: boolean
}

/** The frame and its text, without the badge. */
function Frame({ stamp }: { readonly stamp: StampData }) {
  return (
    <span className="stamp-frame" aria-hidden="true">
      <span className="stamp-head">
        <span className="stamp-word">{stamp.word}</span> <span className="stamp-code">{stamp.code}</span>
      </span>
      {stamp.qualifier.map((part, i) => (
        <Fragment key={i}>
          <span className="stamp-sep"> · </span>
          <span className="stamp-part">{part}</span>
        </Fragment>
      ))}
    </span>
  )
}

export function Stamp({ stamp, badge = true, onOpen, expanded, controls, landing = false }: StampProps) {
  const spec = specOf(stamp.code)
  const name = spokenName(stamp)
  const body = onOpen ? (
    <button type="button" className="stamp-button" onClick={onOpen} aria-expanded={expanded} aria-controls={controls}>
      <Frame stamp={stamp} />
      <span className="visually-hidden">{name}</span>
    </button>
  ) : (
    <>
      <Frame stamp={stamp} />
      <span className="visually-hidden">{name}</span>
    </>
  )
  return (
    <span className={`stamp ${spec.className}${landing ? ' stamp-landing' : ''}`} data-code={stamp.code}>
      {body}
      {badge ? <LaneBadge lane={stamp.lane} /> : null}
    </span>
  )
}
