// What a raw output earned, whatever it was: a stamp; a Lean result read "PROVED modulo k assumed lemmas" with
// each lemma [A]; or no stamp, said in plain words, with an agent's quote as UNREVIEWED text (spine section 8.8;
// DESIGN.md section 5.8). An [?] that guards enforcement says that it fails closed.

import type { Derivation } from '@statespace/stamps'
import { Stamp } from './Stamp.tsx'
import { UnreviewedQuote } from './UnreviewedQuote.tsx'
import './stamp.css'

export interface DerivationViewProps {
  readonly derivation: Derivation
  readonly badge?: boolean
}

export function DerivationView({ derivation, badge = true }: DerivationViewProps) {
  switch (derivation.kind) {
    case 'stamp':
      return (
        <span className="derivation">
          <Stamp stamp={derivation.stamp} badge={badge} />
          {derivation.enforcement === 'fail-closed' ? <span className="derivation-note">Fails closed: the gate refuses until there is a verdict.</span> : null}
        </span>
      )
    case 'modulo':
      return (
        <span className="derivation">
          <span className="derivation-modulo">{derivation.text}</span>
          <span className="derivation-assumed">
            {derivation.assumed.map((s, i) => (
              <Stamp key={i} stamp={s} badge={false} />
            ))}
          </span>
        </span>
      )
    case 'none':
      // an assertion (an agent's, a model's, the course's under audit) shows as its quote alone (DESIGN.md section 11.6)
      return derivation.quote ? (
        <UnreviewedQuote quote={derivation.quote} />
      ) : (
        <span className="derivation derivation-none">
          <span className="derivation-note">{derivation.text}</span>
        </span>
      )
  }
}
