// The lane badge beside every stamp: pencil text with a small line icon, never framed, because frames belong to
// stamps (DESIGN.md section 5.5). Learners see only the badge words; "lane" itself stays out of learner copy
// (spine section 0). The recorded-run label marks the course's own run shown in place of a live one: it is course
// evidence and mints no learner stamp, so it labels a raw verdict, never a stamp (spine section 9.3).

import { LANE_BADGES, RECORDED_RUN_LABELS, type Lane } from '@statespace/stamps'

export type BadgeKind = Lane | 'recorded-run' | 'recorded-result'

const WORDS: Readonly<Record<BadgeKind, string>> = {
  ...LANE_BADGES,
  'recorded-run': RECORDED_RUN_LABELS.run,
  'recorded-result': RECORDED_RUN_LABELS.boot,
}

/** One line icon per badge, drawn in the text's colour (16-px box, 1.5-px solid strokes). */
function Icon({ kind }: { readonly kind: BadgeKind }) {
  const common = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true, focusable: false } as const
  switch (kind) {
    case 'rechecked-here': // a circular arrow: run again, here
      return (
        <svg {...common}>
          <path d="M13 8a5 5 0 1 1-1.5-3.5" />
          <path d="M12 2v3h-3" />
        </svg>
      )
    case 'reported': // a laptop: your machine
      return (
        <svg {...common}>
          <rect x="3" y="3.5" width="10" height="7" />
          <path d="M1.5 12.5h13" />
        </svg>
      )
    case 'self-assessed': // a pencil: your own judgment
      return (
        <svg {...common}>
          <path d="M3 13l1-3.5L11 2.5l2.5 2.5-7 7z" />
          <path d="M9.5 4l2.5 2.5" />
        </svg>
      )
    default: // a recorded run: a page with lines
      return (
        <svg {...common}>
          <path d="M4 1.5h6l2.5 2.5v10.5h-8.5z" />
          <path d="M6 7h5M6 10h5" />
        </svg>
      )
  }
}

export interface LaneBadgeProps {
  readonly lane: BadgeKind
  /** For a recorded run: its ID, engine and version, and date, as the label prints them (DESIGN.md section 11.6). */
  readonly detail?: string
}

export function LaneBadge({ lane, detail }: LaneBadgeProps) {
  const words = WORDS[lane]
  return (
    <span className="lane-badge">
      <Icon kind={lane} />
      <span>{detail ? `${words[0]?.toUpperCase()}${words.slice(1)} ${detail}` : words}</span>
    </span>
  )
}
