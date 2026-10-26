// One specimen in the cabinet: an article with a heading (DESIGN.md section 5.9: a specimen label is an article with a
// heading). Below 900 px the heading is a button that opens the label, with the stamp, the status and the re-find date
// in a line under it; from 900 px the label is open and the heading is a heading, because a button that cannot close
// anything would only be an empty promise to a screen reader.

import { Stamp } from '../../components/stamp/index.ts'
import { COPY } from './copy.ts'
import { LabelBody } from './Label.tsx'
import type { Row } from './model/cabinet.ts'
import { statusText } from './statusText.ts'

export interface ItemProps {
  readonly row: Row
  readonly today: string
  readonly open: boolean
  /** The viewport is wide enough (900 px) to show every label open. */
  readonly wide: boolean
  readonly onToggle: () => void
}

function Chevron() {
  return (
    <svg className="sp-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
      <path d="M5 3l5 5-5 5" />
    </svg>
  )
}

export function Item({ row, today, open, wide, onToggle }: ItemProps) {
  const id = row.entry.record.id
  const headingId = `sp-${id}-heading`
  const panelId = `sp-${id}-panel`
  const shown = wide || open
  const status = statusText(row.state, today)
  const stamp = row.label.derivation.kind === 'stamp' ? row.label.derivation.stamp : null
  const heading = (
    <>
      <span className="sp-id">{id}</span>{' '}
      <span className="sp-title">{row.label.title}</span>
    </>
  )
  return (
    <article className="sp-item" id={id} aria-labelledby={headingId} data-open={shown ? 'true' : 'false'} data-status={row.state.status}>
      <h3 id={headingId} className="sp-item-head">
        {wide ? (
          heading
        ) : (
          <button type="button" className="sp-toggle" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            <span className="sp-toggle-text">{heading}</span>
            <Chevron />
          </button>
        )}
      </h3>
      {shown ? null : (
        <p className="sp-summary">
          {stamp === null ? null : <Stamp stamp={stamp} badge={false} />}
          <span className="sp-summary-status">{status.summary}</span>
          {row.label.incident === null ? null : <span className="sp-tag">{COPY.item.incident}</span>}
        </p>
      )}
      <div id={panelId} className="sp-panel" hidden={!shown}>
        {shown ? <LabelBody row={row} today={today} id={`sp-${id}`} /> : null}
      </div>
    </article>
  )
}
