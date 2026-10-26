// A volume's cover diagram: one figure per stage, drawn from the object that stage is about (the stage's own thing,
// never decoration). Each is a small SVG in white line work over a halftone disc in the volume's deeper ink, so the
// cover reads as two-ink offset print. Decorative on a cover: the cover's link or heading carries the words.

import type { ReactNode } from 'react'

export type Motif =
  | 'lattice' // S1: a search over states, and one witness outside them
  | 'derivation' // S2: a proof tree, premises over conclusions
  | 'syntax' // S3: an abstract syntax tree
  | 'obligation' // S4: Inv ∧ Guard ∧ Step ⇒ Inv′ as nested frames
  | 'lasso' // S5: a behaviour that loops forever
  | 'ladder' // S6: two step sequences tied by a refinement relation
  | 'hasse' // S7: a security lattice
  | 'crash' // S8: a timeline with a crash between every two steps
  | 'square' // S9: a commuting square, compile then run equals run
  | 'strata' // S10: the earlier figures assembled in courses

const W = 100
const H = 140

/** The halftone disc: a dot screen clipped to a circle, in the volume's deep ink. */
function Halftone({ id, cx, cy, r }: { readonly id: string; readonly cx: number; readonly cy: number; readonly r: number }) {
  return (
    <>
      <defs>
        <pattern id={`${id}-dots`} width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <circle cx="1.6" cy="1.6" r="0.95" className="cover-dot" />
        </pattern>
        <clipPath id={`${id}-clip`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill={`url(#${id}-dots)`} clipPath={`url(#${id}-clip)`} />
    </>
  )
}

const node = (x: number, y: number, r = 2.4, filled = true) => (
  <circle key={`n${x},${y}`} cx={x} cy={y} r={r} className={filled ? 'cover-fill' : 'cover-line'} />
)
const seg = (x1: number, y1: number, x2: number, y2: number) => <line key={`l${x1},${y1},${x2},${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} className="cover-line" />

function motif(kind: Motif): ReactNode {
  switch (kind) {
    case 'lattice': {
      // a triangular grid of states (three balances summing to a constant), with one witness fallen outside
      const out: ReactNode[] = []
      const n = 5
      const x0 = 20
      const y0 = 92
      const s = 15
      const pt = (i: number, j: number) => [x0 + s * (i + j / 2), y0 - s * j * 0.866] as const
      for (let j = 0; j <= n; j++)
        for (let i = 0; i + j <= n; i++) {
          const [x, y] = pt(i, j)
          if (i + j < n) {
            const [ax, ay] = pt(i + 1, j)
            out.push(seg(x, y, ax, ay))
          }
          if (i + j < n) {
            const [bx, by] = pt(i, j + 1)
            out.push(seg(x, y, bx, by))
          }
          out.push(node(x, y, 1.7))
        }
      out.push(<rect key="w" x={83} y={100} width={8} height={8} className="cover-fill" />)
      out.push(seg(80, 92, 85, 100))
      return out
    }
    case 'derivation': {
      // inference bars: two premises over each bar, narrowing to one conclusion
      const bar = (x: number, y: number, w: number) => <line key={`b${x},${y}`} x1={x} y1={y} x2={x + w} y2={y} className="cover-line cover-heavy" />
      const leaf = (x: number, y: number, w: number) => <rect key={`r${x},${y}`} x={x} y={y - 5} width={w} height={3.2} className="cover-fill" />
      return [
        leaf(14, 46, 14), leaf(32, 46, 10), leaf(58, 46, 12), leaf(74, 46, 12),
        bar(12, 50, 34), bar(56, 50, 32),
        leaf(20, 62, 18), leaf(64, 62, 16),
        bar(16, 66, 70),
        leaf(34, 78, 34),
        bar(26, 82, 50),
        leaf(40, 94, 20),
      ]
    }
    case 'syntax': {
      const out: ReactNode[] = []
      const t: Array<[number, number, number, number]> = [
        [50, 34, 28, 58], [50, 34, 72, 58], [28, 58, 16, 84], [28, 58, 40, 84], [72, 58, 62, 84], [72, 58, 84, 84], [62, 84, 54, 106], [62, 84, 70, 106],
      ]
      for (const [a, b, c, d] of t) out.push(seg(a, b, c, d))
      for (const [x, y] of [[50, 34], [28, 58], [72, 58], [16, 84], [40, 84], [62, 84], [84, 84], [54, 106], [70, 106]] as const) out.push(node(x, y, 3.4, y > 80 && x !== 62))
      return out
    }
    case 'obligation':
      return [
        <rect key="a" x="14" y="30" width="72" height="80" className="cover-line" />,
        <rect key="b" x="22" y="40" width="56" height="54" className="cover-line" />,
        <rect key="c" x="30" y="50" width="40" height="28" className="cover-line" />,
        <rect key="d" x="38" y="58" width="24" height="12" className="cover-fill" />,
        seg(50, 94, 50, 118),
        <path key="e" d="M44 112 L50 120 L56 112" className="cover-line" />,
      ]
    case 'lasso': {
      const out: ReactNode[] = []
      const ring = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2
        return [62 + 22 * Math.cos(a), 74 + 22 * Math.sin(a)] as const
      })
      ring.forEach(([x, y], i) => {
        const [nx, ny] = ring[(i + 1) % ring.length] ?? ring[0]!
        out.push(seg(x, y, nx, ny))
      })
      const tail = [[14, 30], [24, 44], [36, 54]] as const
      tail.forEach(([x, y], i) => {
        const [nx, ny] = tail[i + 1] ?? ring[4]!
        out.push(seg(x, y, nx, ny))
      })
      ring.forEach(([x, y]) => out.push(node(x, y, 2.6)))
      tail.forEach(([x, y]) => out.push(node(x, y, 2.6, false)))
      return out
    }
    case 'ladder': {
      const out: ReactNode[] = [seg(28, 26, 28, 116), seg(72, 26, 72, 116)]
      for (let y = 30; y <= 112; y += 16.4) {
        out.push(node(28, y, 2.6))
        out.push(node(72, y + 8, 2.6, false))
        out.push(seg(30.6, y, 69.4, y + 8))
      }
      return out
    }
    case 'hasse': {
      // the cube of subsets of three labels, bottom to top
      const P: Array<[number, number]> = [[50, 116], [24, 90], [50, 90], [76, 90], [24, 58], [50, 58], [76, 58], [50, 32]]
      const E: Array<[number, number]> = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 4], [2, 6], [3, 5], [3, 6], [4, 7], [5, 7], [6, 7]]
      return [...E.map(([a, b]) => seg(P[a]![0], P[a]![1], P[b]![0], P[b]![1])), ...P.map(([x, y], i) => node(x, y, 3, i !== 0 && i !== 7))]
    }
    case 'crash': {
      const out: ReactNode[] = [seg(12, 70, 88, 70)]
      for (let i = 0; i < 5; i++) out.push(node(16 + i * 17, 70, 3.4))
      for (let i = 0; i < 4; i++) {
        const x = 24.5 + i * 17
        out.push(seg(x - 3.5, 80 + (i % 2) * 8, x + 3.5, 87 + (i % 2) * 8))
        out.push(seg(x + 3.5, 80 + (i % 2) * 8, x - 3.5, 87 + (i % 2) * 8))
        out.push(seg(x, 72, x, 79 + (i % 2) * 8))
      }
      out.push(seg(12, 44, 88, 44))
      for (let i = 0; i < 5; i++) out.push(node(16 + i * 17, 44, 2.2, false))
      return out
    }
    case 'square':
      return [
        seg(26, 40, 70, 40), seg(26, 40, 26, 96), seg(74, 44, 74, 96), seg(26, 100, 70, 100),
        <path key="a1" d="M66 36 L72 40 L66 44" className="cover-line" />,
        <path key="a2" d="M70 92 L74 98 L78 92" className="cover-line" />,
        <path key="a3" d="M22 92 L26 98 L30 92" className="cover-line" />,
        <path key="a4" d="M66 96 L72 100 L66 104" className="cover-line" />,
        node(26, 40, 3.4), node(74, 40, 3.4, false), node(26, 100, 3.4, false), node(74, 100, 3.4),
      ]
    case 'strata': {
      const out: ReactNode[] = []
      const rows = [
        [20, 94, 60], [24, 82, 52], [28, 70, 44], [32, 58, 36], [36, 46, 28], [40, 34, 20],
      ] as const
      rows.forEach(([x, y, w], i) => out.push(<rect key={`s${i}`} x={x} y={y} width={w} height={9} className={i % 2 === 0 ? 'cover-fill' : 'cover-line'} />))
      out.push(<rect key="top" x="38" y="16" width="24" height="14" className="cover-line" />)
      return out
    }
  }
}

/** The figure for a volume. `id` must be unique on the page (pattern and clip ids). */
export function CoverArt({ kind, id, className }: { readonly kind: Motif; readonly id: string; readonly className?: string }) {
  return (
    <svg className={`cover-art${className ? ` ${className}` : ''}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <Halftone id={id} cx={58} cy={64} r={38} />
      <g className="cover-plate">{motif(kind)}</g>
      <g className="cover-key">{motif(kind)}</g>
    </svg>
  )
}
