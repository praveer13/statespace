// A rate's Wilson interval drawn as a dimension line (DESIGN.md sections 1.2 and 6.12): a solid line with end ticks on a 0 to 100%
// axis, a mark at the hit rate, and a pale bracket and field above it for the band's range: `lo` to `hi`, which the screen sets from the
// printed band (guess, from the band's chance level to 2/3). Ink and pencil only, no dashes, no color. It is a drawing of numbers
// the row already prints, so it is hidden from assistive technology.

import type { Rate } from '@statespace/learner/mirror'

const W = 300
/** A share of the axis in drawing units, to a tenth: a path never carries a fifteen-digit coordinate. */
const X = (p: number): number => Math.round(Math.max(0, Math.min(1, p)) * W * 10) / 10

export function Interval({ rate, lo, hi }: { readonly rate: Rate; readonly lo: number; readonly hi: number }) {
  return (
    <svg className="mr-interval" viewBox={`0 0 ${W} 30`} aria-hidden="true" focusable="false">
      {/* the band's printed range: a pale field from the bracket down to the axis, and the bracket above it */}
      <rect className="mr-range" x={X(lo)} y={3} width={Math.round((X(hi) - X(lo)) * 10) / 10} height={23} />
      <path className="mr-bracket" d={`M${X(lo)} 9 V3 H${X(hi)} V9`} />
      {/* the axis, 0 to 100%, with a short tick at each quarter */}
      <path className="mr-axis" d={`M0 26 H${W}`} />
      <path className="mr-axis" d={`M0 22 V30 M${W} 22 V30`} />
      <path className="mr-axis-tick" d={`M${W / 4} 24 V28 M${W / 2} 23 V29 M${(3 * W) / 4} 24 V28`} />
      {/* the interval: a dimension line with its end ticks */}
      <path className="mr-dimension" d={`M${X(rate.low)} 16 H${X(rate.high)} M${X(rate.low)} 11 V21 M${X(rate.high)} 11 V21`} />
      {/* the hit rate */}
      <path className="mr-rate" d={`M${X(rate.rate)} 10 V22`} />
    </svg>
  )
}
