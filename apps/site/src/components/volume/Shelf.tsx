// The shelf: the ten stages as spines standing side by side. A spine's thickness follows the volume's planned minutes
// (written lessons plus the lab), so the shelf is a true picture of where the course's time goes. Only the volume in
// hand floods with its ink; the rest stay newsprint with a band of their colour. Below the shelf, the volume in hand
// shows its cover, its question and the way in. Every spine is a link with its full name; nothing locks.

import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import type { StagePage } from '@statespace/content'
import { question, summarize } from '../../screens/stages/summary.ts'
import { CoverArt } from './CoverArt.tsx'
import { splitTitle, volumeOf } from './volumes.ts'
import './volume.css'

const hours = (min: number) => {
  const h = min / 60
  return h < 1 ? `about ${Math.round(min)} min` : `about ${h < 10 ? h.toFixed(1).replace(/\.0$/, '') : Math.round(h)} h`
}

export function Shelf({ stages }: { readonly stages: readonly StagePage[] }) {
  const [held, setHeld] = useState(0)
  const rows = stages
    .map((s) => {
      const v = volumeOf(s.id)
      if (v === undefined) return null
      const sum = summarize(s)
      return { s, v, sum, minutes: sum.lessonMinutes + sum.labMinutes, ...splitTitle(s.title) }
    })
    .filter((r) => r !== null)
  const most = Math.max(1, ...rows.map((r) => r.minutes))
  const hand = rows[held] ?? rows[0]

  return (
    <div className="shelf">
      <ol className="shelf-row">
        {rows.map((r, i) => (
          <li key={r.s.id} style={{ '--vol': r.v.ink, '--thick': (0.42 + 0.58 * (r.minutes / most)).toFixed(3) } as CSSProperties}>
            <Link
              to={`/stages/${r.s.id}`}
              className="spine"
              data-held={i === held ? 'true' : undefined}
              onMouseEnter={() => setHeld(i)}
              onFocus={() => setHeld(i)}
            >
              <span className="spine-n" aria-hidden="true">
                {r.v.n}
              </span>
              <span className="spine-title">
                <span className="visually-hidden">Volume {r.v.n}, </span>
                {r.name}
              </span>
              <span className="spine-tools">
                <span className="visually-hidden">, </span>
                {r.tools}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {hand !== undefined ? (
        <div className="shelf-hand" style={{ '--vol': hand.v.ink } as CSSProperties}>
          <div className="mini-cover" aria-hidden="true">
            <span className="mini-cover-n">{hand.v.n}</span>
            <CoverArt kind={hand.v.motif} id={`hand-${hand.s.id}`} />
          </div>
          <div className="shelf-hand-text">
            <p className="shelf-hand-name">
              Volume {hand.v.n} · {hand.name}
            </p>
            <p className="shelf-hand-q">{question(hand.s)}</p>
            <p className="shelf-hand-meta">
              {hand.sum.lessons} lessons{hand.tools !== '' ? ` · ${hand.tools}` : ''} · {hours(hand.minutes)} planned
            </p>
            <Link to={`/stages/${hand.s.id}`} className="shelf-hand-open">
              Open volume {hand.v.n}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
