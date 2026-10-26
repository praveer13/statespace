// An agent's or a language model's assertion: quoted text under the label UNREVIEWED, attributed, in pencil, with
// a 1-px pencil rule and never a frame (I8; DESIGN.md sections 5.8 and 6.15). A course-authored claim under audit
// shows the same way under UNDER AUDIT (spine section 8.8). It fills no stamp and no strip.

import type { UnreviewedQuote as Quote } from '@statespace/stamps'
import './stamp.css'

export interface UnreviewedQuoteProps {
  readonly quote: Quote
}

export function UnreviewedQuote({ quote }: UnreviewedQuoteProps) {
  const who = quote.by === 'the agent' ? "the agent's words" : quote.by === 'the course' ? "the course's claim" : `${quote.by}'s words`
  return (
    <figure className="unreviewed">
      <figcaption className="unreviewed-label">
        {quote.label} · {who}
      </figcaption>
      <blockquote className="unreviewed-quote">
        <p>“{quote.quote}”</p>
      </blockquote>
    </figure>
  )
}
