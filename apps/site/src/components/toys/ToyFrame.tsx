// The frame every lesson toy sits in: a numbered-figure plate like a recorded run's, with a header strip in the volume's
// ink (read from the inherited --vol that the lesson page sets), the toy on paper inside a 1.5-px ink frame, and a
// caption that says what the page computes. A toy brings its own controls and its own aria-live status line.

import { useId } from 'react'
import type { ReactNode } from 'react'
import './toys.css'

export interface ToyFrameProps {
  readonly title: string
  /** What sort of figure: "Interactive" by default, or "Game", "Animation". */
  readonly kind?: string
  /** What the figure shows and computes, and what it does not claim. */
  readonly caption: ReactNode
  readonly children: ReactNode
}

export function ToyFrame({ title, kind = 'Interactive', caption, children }: ToyFrameProps) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  return (
    <figure className="toy no-margin" aria-labelledby={`${uid}-title`}>
      <div className="toy-head">
        <span className="toy-kind">Figure · {kind} ·</span>
        <span id={`${uid}-title`} className="toy-title">
          {title}
        </span>
      </div>
      <div className="toy-body">{children}</div>
      <figcaption className="toy-cap">{caption}</figcaption>
    </figure>
  )
}
